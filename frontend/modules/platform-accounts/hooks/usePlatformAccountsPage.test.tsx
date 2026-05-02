import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountAssignment } from '@services/accountAssignmentService';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const usePermissionsMock = vi.hoisted(() => vi.fn());

const platformAccountServiceMock = vi.hoisted(() => ({
  getApps: vi.fn(),
  getEmployees: vi.fn(),
  getAccounts: vi.fn(),
}));

const accountAssignmentServiceMock = vi.hoisted(() => ({
  getActiveAssignments: vi.fn(),
  getAssignmentsForMonthYear: vi.fn(),
  assignPlatformAccount: vi.fn(),
  getHistoryByAccountId: vi.fn(),
}));

const auditServiceMock = vi.hoisted(() => ({
  logAdminAction: vi.fn(),
}));

const monthlyActiveEmployeeIdsMock = vi.hoisted(() => vi.fn());

vi.mock('@shared/components/ui/sonner', () => ({
  toast: toastMock,
}));

vi.mock('@app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    role: 'admin',
  }),
}));

vi.mock('@shared/hooks/usePermissions', () => ({
  usePermissions: usePermissionsMock,
}));

vi.mock('@app/providers/SystemSettingsContext', () => ({
  useSystemSettings: () => ({
    settings: { iqama_alert_days: 90 },
  }),
}));

vi.mock('@shared/hooks/useMonthlyActiveEmployeeIds', () => ({
  useMonthlyActiveEmployeeIds: monthlyActiveEmployeeIdsMock,
}));

vi.mock('@shared/hooks/useAuthQueryGate', () => ({
  authQueryUserId: (uid: string | null | undefined) => uid ?? '__none__',
  useAuthQueryGate: () => ({
    enabled: true,
    userId: 'u1',
  }),
}));

vi.mock('@shared/hooks/useQueryErrorToast', () => ({
  useQueryErrorToast: vi.fn(),
}));

vi.mock('@services/platformAccountService', () => ({
  platformAccountService: platformAccountServiceMock,
}));

vi.mock('@services/accountAssignmentService', () => ({
  accountAssignmentService: accountAssignmentServiceMock,
}));

vi.mock('@services/auditService', () => ({
  auditService: auditServiceMock,
}));

import { usePlatformAccountsPage } from './usePlatformAccountsPage';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('usePlatformAccountsPage', () => {
  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Permission: allow edit for the hook tests (button gating is tested elsewhere).
    usePermissionsMock.mockReturnValue({
      permissions: { can_view: true, can_edit: true, can_delete: false },
      loading: false,
      isAdmin: true,
    });

    monthlyActiveEmployeeIdsMock.mockReturnValue({
      data: { employeeIds: new Set(['emp-2']) },
    });

    platformAccountServiceMock.getApps.mockResolvedValue([
      { id: 'app-1', name: 'App 1', brand_color: '#111111', text_color: '#ffffff' },
    ]);

    platformAccountServiceMock.getEmployees.mockResolvedValue([
      {
        id: 'emp-1',
        name: 'Alice',
        national_id: 'n1',
        residency_expiry: '2026-12-31',
        sponsorship_status: 'terminated',
        probation_end_date: '2026-06-01',
      },
      { id: 'emp-2', name: 'Bob', national_id: 'n2', residency_expiry: null, sponsorship_status: null },
    ]);

    platformAccountServiceMock.getAccounts.mockResolvedValue([
      {
        id: 'acc-1',
        app_id: 'app-1',
        employee_id: null,
        account_username: 'acc-username-1',
        account_id_on_platform: 'P-1',
        iqama_number: 'IQ-1',
        iqama_expiry_date: null,
        status: 'active',
        notes: null,
        created_at: '2026-04-01T00:00:00Z',
      },
    ]);

    accountAssignmentServiceMock.getActiveAssignments.mockResolvedValue([
      { account_id: 'acc-1', employee_id: 'emp-2' },
    ]);

    accountAssignmentServiceMock.getAssignmentsForMonthYear.mockResolvedValue([
      { account_id: 'acc-1' },
    ]);
  });

  it('ربط أسماء السجل التاريخي بـ employeesFull حتى لو كان الموظف غير ظاهر في employees', async () => {
    auditServiceMock.logAdminAction.mockResolvedValue(undefined);

    accountAssignmentServiceMock.getHistoryByAccountId.mockResolvedValue([
      {
        id: 'as-1',
        account_id: 'acc-1',
        employee_id: 'emp-1', // Alice (filtered out from employees)
        start_date: '2026-02-01',
        end_date: null,
        month_year: '2026-02',
        notes: 'handover',
        created_at: '2026-02-01T00:00:00Z',
      },
    ]);

    const { result } = renderHook(() => usePlatformAccountsPage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.employeesFull.some((e) => e.id === 'emp-1')).toBe(true);
    expect(result.current.employees.some((e) => e.id === 'emp-1')).toBe(false);

    const account = result.current.accounts?.[0];
    if (!account) {
      throw new Error('Account is undefined');
    }

    await act(async () => {
      await result.current.openHistory(account);
    });

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(result.current.historyGroups).toHaveLength(1);
    expect(result.current.historyGroups?.[0]?.assignments?.[0]?.employee_name).toBe('Alice');
  });

  it('تدفق التعيين: clearing flags و استمرار النجاح إذا فشل audit', async () => {
    // Make audit fail but keep core assignment success.
    auditServiceMock.logAdminAction.mockRejectedValueOnce(new Error('audit down'));

    const assignDeferred = createDeferred<AccountAssignment>();
    accountAssignmentServiceMock.assignPlatformAccount.mockReturnValue(assignDeferred.promise);

    const { result } = renderHook(() => usePlatformAccountsPage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const account = result.current.accounts?.[0];
    if (!account) {
      throw new Error('Account is undefined');
    }
    act(() => {
      result.current.openAssign(account);
    });

    act(() => {
      result.current.setAssignForm({
        employee_id: 'emp-2',
        start_date: '2026-04-02',
        notes: ' note ',
      });
    });

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.saveAssign();
    });

    await waitFor(() => expect(result.current.savingAssign).toBe(true));

    // Allow the core assignment to complete; audit remains failing (mocked above).
    assignDeferred.resolve({
      id: 'assignment-1',
      account_id: 'acc-1',
      employee_id: 'emp-2',
      start_date: '2026-04-02',
      end_date: null,
      month_year: '2026-04',
      notes: 'note',
      created_at: '2026-04-02T00:00:00Z',
    });

    await savePromise;

    await waitFor(() => expect(result.current.savingAssign).toBe(false));
    expect(result.current.assignDialog).toBe(false);
    expect(toastMock.success).toHaveBeenCalled();

    expect(accountAssignmentServiceMock.assignPlatformAccount).toHaveBeenCalledWith({
      account_id: 'acc-1',
      employee_id: 'emp-2',
      start_date: '2026-04-02',
      notes: 'note',
      created_by: 'admin-1',
    });

    await waitFor(() => expect(platformAccountServiceMock.getApps).toHaveBeenCalledTimes(2));
  });
});

