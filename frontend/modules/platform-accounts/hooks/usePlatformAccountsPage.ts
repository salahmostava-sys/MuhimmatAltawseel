import { useCallback, useMemo, useState } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import {
  TOAST_ERROR_GENERIC,
  TOAST_SUCCESS_ACTION,
  TOAST_SUCCESS_ADD,
  TOAST_SUCCESS_EDIT,
} from '@shared/lib/toastMessages';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useQueryErrorToast } from '@shared/hooks/useQueryErrorToast';
import { useSystemSettings } from '@app/providers/SystemSettingsContext';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { filterVisibleEmployeesInMonth } from '@shared/lib/employeeVisibility';
import { defaultQueryRetry } from '@shared/lib/query';
import { auditService } from '@services/auditService';
import { logger } from '@shared/lib/logger';
import {
  platformAccountService,
  type PlatformAccountWritePayload,
} from '@services/platformAccountService';
import { accountAssignmentService } from '@services/accountAssignmentService';
import {
  buildAssignmentEmployeePreview,
  buildAssignmentHistoryGroups,
  buildNewAccountForm,
  buildPlatformAccounts,
  filterPlatformAccounts,
  sortPlatformAccounts,
} from '@modules/platform-accounts/lib/platformAccountsModel';
import type {
  AccountDialogForm,
  AssignDialogForm,
  AssignmentHistoryGroup,
  AssignmentWithName,
  PlatformAccountView,
  PlatformAppOption,
  PlatformEmployeeOption,
  SortDir,
  SortKey,
} from '@modules/platform-accounts/types';

export const usePlatformAccountsPage = () => {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions: perms } = usePermissions('platform_accounts');
  const { settings } = useSystemSettings();
  const alertDays = settings?.iqama_alert_days ?? 90;
  const monthYearNow = format(new Date(), 'yyyy-MM');
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(monthYearNow);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;

  const {
    data: pageData,
    isLoading: loading,
    isError: isPageDataError,
    error: pageDataError,
    refetch: refetchPageData,
  } = useQuery({
    queryKey: ['platform-accounts', uid, 'page-data'],
    enabled,
    queryFn: async () => {
      const [appsRes, employeeRes, accountsRes, activeAssignmentsRes, monthAssignmentsRes] =
        await Promise.all([
          platformAccountService.getApps(),
          platformAccountService.getEmployees(),
          platformAccountService.getAccounts(),
          accountAssignmentService.getActiveAssignments(),
          accountAssignmentService.getAssignmentsForMonthYear(monthYearNow),
        ]);

      return {
        appsData: (appsRes ?? []) as PlatformAppOption[],
        employeeData: (employeeRes ?? []) as PlatformEmployeeOption[],
        enrichedAccounts: buildPlatformAccounts({
          apps: (appsRes ?? []) as PlatformAppOption[],
          employees: (employeeRes ?? []) as PlatformEmployeeOption[],
          accounts: (accountsRes ?? []) as PlatformAccountView[],
          activeAssignments: (activeAssignmentsRes ?? []) as Array<{
            account_id: string;
            employee_id: string;
          }>,
          monthAssignmentRows: (monthAssignmentsRes ?? []) as Array<{ account_id: string }>,
        }),
      };
    },
    retry: defaultQueryRetry,
    staleTime: 60_000,
  });

  useQueryErrorToast(isPageDataError, pageDataError, TOAST_ERROR_GENERIC, refetchPageData);

  const apps = useMemo<PlatformAppOption[]>(() => pageData?.appsData ?? [], [pageData]);

  const employeesFull = useMemo<PlatformEmployeeOption[]>(
    () => pageData?.employeeData ?? [],
    [pageData],
  );

  const employees = useMemo(
    () => filterVisibleEmployeesInMonth(employeesFull, activeEmployeeIdsInMonth),
    [employeesFull, activeEmployeeIdsInMonth],
  );

  const accounts = useMemo<PlatformAccountView[]>(
    () => pageData?.enrichedAccounts ?? [],
    [pageData],
  );

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('iqama_expiry_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [accountDialog, setAccountDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PlatformAccountView | null>(null);
  const [accountForm, setAccountForm] = useState<AccountDialogForm>(buildNewAccountForm);
  const [savingAccount, setSavingAccount] = useState(false);

  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PlatformAccountView | null>(null);
  const [assignForm, setAssignForm] = useState<AssignDialogForm>({
    employee_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [savingAssign, setSavingAssign] = useState(false);

  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<PlatformAccountView | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const applyEmployeeToAccountForm = useCallback(
    (employeeId: string | null) => {
      if (!employeeId) {
        setAccountForm((current) => ({
          ...current,
          employee_id: null,
          account_username: '',
          iqama_number: '',
          iqama_expiry_date: '',
        }));
        return;
      }

      const employee = employeesFull.find((item) => item.id === employeeId);
      if (!employee) return;

      setAccountForm((current) => ({
        ...current,
        employee_id: employeeId,
        account_username: employee.name.trim(),
        iqama_number: employee.national_id?.trim() || '',
        iqama_expiry_date: employee.residency_expiry
          ? String(employee.residency_expiry).slice(0, 10)
          : '',
      }));
    },
    [employeesFull],
  );

  const openAddAccount = useCallback(() => {
    setEditingAccount(null);
    setAccountForm(buildNewAccountForm());
    setAccountDialog(true);
  }, []);

  const openEditAccount = useCallback((account: PlatformAccountView) => {
    setEditingAccount(account);
    setAccountForm({
      employee_id: account.employee_id ?? null,
      app_id: account.app_id,
      account_username: account.account_username,
      account_id_on_platform: account.account_id_on_platform ?? '',
      iqama_number: account.iqama_number ?? '',
      iqama_expiry_date: account.iqama_expiry_date ?? '',
      status: account.status,
      notes: account.notes ?? '',
    });
    setAccountDialog(true);
  }, []);

  const accountEmployeeSelectValue = accountForm.employee_id
    ? String(accountForm.employee_id)
    : '__none__';

  const accountEmployeeOrphan =
    Boolean(accountForm.employee_id) &&
    !employeesFull.some((employee) => employee.id === accountForm.employee_id);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setSortKey(key);
      setSortDir('asc');
    },
    [sortKey],
  );

  const saveAccount = useCallback(async () => {
    if (!accountForm.app_id) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'يرجى اختيار المنصة' });
      return;
    }

    if (!accountForm.account_username.trim()) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'اسم الحساب مطلوب' });
      return;
    }

    setSavingAccount(true);

    const payload: PlatformAccountWritePayload = {
      app_id: accountForm.app_id,
      account_username: accountForm.account_username.trim(),
      employee_id: accountForm.employee_id || null,
      account_id_on_platform: accountForm.account_id_on_platform.trim() || null,
      iqama_number: accountForm.iqama_number.trim() || null,
      iqama_expiry_date: accountForm.iqama_expiry_date || null,
      status: accountForm.status ?? 'active',
      notes: accountForm.notes.trim() || null,
    };

    try {
      if (editingAccount) {
        await platformAccountService.updateAccount(editingAccount.id, payload);
        await auditService.logAdminAction({
          action: 'platform_accounts.update',
          table_name: 'platform_accounts',
          record_id: editingAccount.id,
          meta: { fields: Object.keys(payload), app_id: payload.app_id, status: payload.status },
        });
      } else {
        const created = await platformAccountService.createAccount(payload);
        await auditService.logAdminAction({
          action: 'platform_accounts.create',
          table_name: 'platform_accounts',
          record_id: created.id,
          meta: {
            account_username: payload.account_username,
            app_id: payload.app_id,
            status: payload.status,
          },
        });
      }
    } catch (error: unknown) {
      setSavingAccount(false);
      const message = error instanceof Error ? error.message : TOAST_ERROR_GENERIC;
      toast.error(TOAST_ERROR_GENERIC, { description: message });
      return;
    }

    setSavingAccount(false);
    toast.success(editingAccount ? TOAST_SUCCESS_EDIT : TOAST_SUCCESS_ADD);
    setAccountDialog(false);
    void refetchPageData();
  }, [accountForm, editingAccount, refetchPageData]);

  const openAssign = useCallback((account: PlatformAccountView) => {
    setAssignTarget(account);
    setAssignForm({
      employee_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setAssignDialog(true);
  }, []);

  const saveAssign = useCallback(async () => {
    if (!assignTarget) return;

    if (!assignForm.employee_id || !assignForm.start_date) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'يرجى استكمال بيانات التعيين' });
      return;
    }

    setSavingAssign(true);

    const monthYear = assignForm.start_date.slice(0, 7);

    try {
      await accountAssignmentService.assignPlatformAccount({
        account_id: assignTarget.id,
        employee_id: assignForm.employee_id,
        start_date: assignForm.start_date,
        notes: assignForm.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      // Audit is non-blocking for the core operation.
      try {
        await auditService.logAdminAction({
          action: 'platform_account_assignments.create',
          table_name: 'platform_accounts',
          record_id: assignTarget.id,
          meta: {
            employee_id: assignForm.employee_id,
            start_date: assignForm.start_date,
            month_year: monthYear,
            notes: assignForm.notes.trim() || null,
          },
        });
      } catch (auditError: unknown) {
        logger.error('Audit failed for platform account assignment (create)', auditError);
      }

      toast.success(TOAST_SUCCESS_ACTION);
      setAssignDialog(false);
      void refetchPageData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : TOAST_ERROR_GENERIC;
      toast.error(TOAST_ERROR_GENERIC, { description: message });
      return;
    } finally {
      setSavingAssign(false);
    }
  }, [assignForm, assignTarget, user?.id, refetchPageData]);

  const openHistory = useCallback(async (account: PlatformAccountView) => {
    setHistoryAccount(account);
    setHistoryDialog(true);
    setHistoryLoading(true);

    try {
      const data = await accountAssignmentService.getHistoryByAccountId(account.id);
      // Audit is non-blocking for the core operation.
      try {
        await auditService.logAdminAction({
          action: 'platform_account_assignments.view_history',
          table_name: 'platform_accounts',
          record_id: account.id,
          meta: { count: Array.isArray(data) ? data.length : 0 },
        });
      } catch (auditError: unknown) {
        logger.error('Audit failed for platform account assignment (view_history)', auditError);
      }

      // التاريخ يجب أن يعرض أسماء الموظفين من القائمة الكاملة،
      // لأن قائمة `employees` قد تكون مفلترة حسب نشاط/ظهور الموظفين في الشهر.
      const employeeMap = Object.fromEntries(
        employeesFull.map((employee) => [employee.id, employee.name]),
      );
      const assignments: AssignmentWithName[] = ((data ?? []) as Array<{
        id: string;
        account_id: string;
        employee_id: string;
        start_date: string;
        end_date: string | null;
        month_year: string;
        notes: string | null;
        created_at: string;
      }>).map((row) => ({
        ...row,
        employee_name: employeeMap[row.employee_id] ?? 'غير معروف',
      }));

      setHistoryAccount((current) => (current ? { ...current, assignments } : null));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : TOAST_ERROR_GENERIC;
      toast.error(TOAST_ERROR_GENERIC, { description: message });
      // Keep dialog context (account title) but show empty history groups.
      setHistoryAccount(account);
    } finally {
      setHistoryLoading(false);
    }
  }, [employeesFull]);

  const filteredAccounts = useMemo(
    () =>
      filterPlatformAccounts({
        accounts,
        search,
        status: filterStatus,
        platformId: platformFilter,
      }),
    [accounts, search, filterStatus, platformFilter],
  );

  const sortedAccounts = useMemo(
    () => sortPlatformAccounts(filteredAccounts, sortKey, sortDir),
    [filteredAccounts, sortKey, sortDir],
  );

  const selectedAssignEmployee = useMemo(
    () => employees.find((employee) => employee.id === assignForm.employee_id) ?? null,
    [employees, assignForm.employee_id],
  );

  const selectedAssignEmployeePreview = useMemo(
    () => buildAssignmentEmployeePreview(selectedAssignEmployee),
    [selectedAssignEmployee],
  );

  const historyGroups = useMemo<AssignmentHistoryGroup[]>(
    () => buildAssignmentHistoryGroups(historyAccount?.assignments),
    [historyAccount?.assignments],
  );

  const activeCount = useMemo(
    () => accounts.filter((account) => account.status === 'active').length,
    [accounts],
  );

  const warnCount = useMemo(
    () =>
      accounts.filter((account) => {
        if (!account.iqama_expiry_date) return false;
        return differenceInDays(parseISO(account.iqama_expiry_date), new Date()) <= alertDays;
      }).length,
    [accounts, alertDays],
  );

  const hasActiveFilters = useMemo(
    () => Boolean(search || platformFilter !== 'all' || filterStatus !== 'all'),
    [search, platformFilter, filterStatus],
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterStatus('all');
    setPlatformFilter('all');
  }, []);

  return {
    perms,
    loading,
    alertDays,
    accounts,
    apps,
    employees,
    employeesFull,
    activeCount,
    warnCount,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    platformFilter,
    setPlatformFilter,
    sortKey,
    sortDir,
    toggleSort,
    sortedAccounts,
    hasActiveFilters,
    accountDialog,
    setAccountDialog,
    editingAccount,
    accountForm,
    setAccountForm,
    savingAccount,
    openAddAccount,
    openEditAccount,
    accountEmployeeSelectValue,
    accountEmployeeOrphan,
    applyEmployeeToAccountForm,
    saveAccount,
    assignDialog,
    setAssignDialog,
    assignTarget,
    assignForm,
    setAssignForm,
    savingAssign,
    selectedAssignEmployeePreview,
    openAssign,
    saveAssign,
    historyDialog,
    setHistoryDialog,
    historyAccount,
    historyLoading,
    historyGroups,
    openHistory,
    clearFilters,
  };
};
