import { differenceInDays, format, parseISO } from 'date-fns';
import type {
  AccountDialogForm,
  AssignmentEmployeePreview,
  AssignmentHistoryGroup,
  AssignmentWithName,
  IqamaBadge,
  PlatformAccountView,
  PlatformAppOption,
  PlatformEmployeeOption,
  SortDir,
  SortKey,
} from '@modules/platform-accounts/types';

export const buildPlatformAccounts = ({
  apps,
  employees,
  accounts,
  activeAssignments,
  monthAssignmentRows,
}: {
  apps: PlatformAppOption[];
  employees: PlatformEmployeeOption[];
  accounts: PlatformAccountView[];
  activeAssignments: Array<{ account_id: string; employee_id: string }>;
  monthAssignmentRows: Array<{ account_id: string }>;
}) => {
  const countByAccount = new Map<string, number>();
  monthAssignmentRows.forEach((row) => {
    countByAccount.set(row.account_id, (countByAccount.get(row.account_id) ?? 0) + 1);
  });

  const appMap = Object.fromEntries(apps.map((app) => [app.id, app]));
  const employeeMap = Object.fromEntries(employees.map((employee) => [employee.id, employee]));

  return accounts.map((account) => {
    const activeAssignment = activeAssignments.find((assignment) => assignment.account_id === account.id);

    return {
      ...account,
      app_name: appMap[account.app_id]?.name ?? '-',
      app_color: appMap[account.app_id]?.brand_color ?? '#6366f1',
      app_text_color: appMap[account.app_id]?.text_color ?? '#ffffff',
      current_employee: activeAssignment ? employeeMap[activeAssignment.employee_id] ?? null : null,
      assignments_this_month_count: countByAccount.get(account.id) ?? 0,
    };
  });
};

export const getIqamaBadge = (expiry: string | null, alertDays: number): IqamaBadge | null => {
  if (!expiry) return null;

  const days = differenceInDays(parseISO(expiry), new Date());

  if (days < 0) {
    return {
      label: `منتهية منذ ${Math.abs(days)} يوم`,
      cls: 'bg-destructive/10 text-destructive border-destructive/20',
    };
  }

  if (days <= 14) {
    return {
      label: `${days} يوم متبقي`,
      cls: 'bg-destructive/15 text-destructive border-destructive/20',
    };
  }

  if (days <= alertDays) {
    return {
      label: `${days} يوم متبقي`,
      cls: 'bg-warning/15 text-warning border-warning/20',
    };
  }

  return {
    label: format(parseISO(expiry), 'dd/MM/yyyy'),
    cls: 'bg-success/10 text-success border-success/20',
  };
};

export const buildAssignmentHistoryGroups = (
  assignments: AssignmentWithName[] | undefined,
): AssignmentHistoryGroup[] => {
  if (!assignments?.length) return [];

  const groupedByMonth = new Map<string, AssignmentWithName[]>();

  assignments.forEach((assignment) => {
    const month = assignment.month_year || '-';
    const monthAssignments = groupedByMonth.get(month) ?? [];
    monthAssignments.push(assignment);
    groupedByMonth.set(month, monthAssignments);
  });

  return Array.from(groupedByMonth.entries())
    .sort(([leftMonth], [rightMonth]) => rightMonth.localeCompare(leftMonth))
    .map(([month, monthAssignments]) => ({
      month,
      count: monthAssignments.length,
      hasMultipleAssignments: monthAssignments.length > 1,
      assignments: monthAssignments,
    }));
};

export const buildAssignmentEmployeePreview = (
  employee: PlatformEmployeeOption | null | undefined,
): AssignmentEmployeePreview => {
  if (!employee) {
    return {
      nationalId: null,
      residencyExpiryLabel: null,
    };
  }

  return {
    nationalId: employee.national_id?.trim() || null,
    residencyExpiryLabel: employee.residency_expiry
      ? format(parseISO(String(employee.residency_expiry).slice(0, 10)), 'dd/MM/yyyy')
      : null,
  };
};

export const filterPlatformAccounts = ({
  accounts,
  search,
  status,
  platformId,
}: {
  accounts: PlatformAccountView[];
  search: string;
  status: string;
  platformId: string;
}) => {
  return accounts.filter((account) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      account.account_username.toLowerCase().includes(query) ||
      (account.account_id_on_platform ?? '').toLowerCase().includes(query) ||
      (account.iqama_number ?? '').includes(search) ||
      (account.current_employee?.name ?? '').includes(query);

    const matchesStatus = status === 'all' || account.status === status;
    const matchesPlatform = platformId === 'all' || account.app_id === platformId;

    return matchesSearch && matchesStatus && matchesPlatform;
  });
};

export const sortPlatformAccounts = (
  accounts: PlatformAccountView[],
  sortKey: SortKey,
  sortDir: SortDir,
) => {
  const dir = sortDir === 'asc' ? 1 : -1;

  const getValue = (account: PlatformAccountView) => {
    switch (sortKey) {
      case 'account_username':
        return account.account_username ?? '';
      case 'account_id_on_platform':
        return account.account_id_on_platform ?? '';
      case 'iqama_number':
        return account.iqama_number ?? '';
      case 'iqama_expiry_date':
        return account.iqama_expiry_date ? new Date(account.iqama_expiry_date).getTime() : null;
      case 'current_employee':
        return account.current_employee?.name ?? '';
      case 'status':
        return account.status ?? '';
      case 'assignments_month':
        return account.assignments_this_month_count ?? 0;
      default:
        return '';
    }
  };

  return [...accounts].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue === null && rightValue === null) return 0;
    if (leftValue === null) return 1 * dir;
    if (rightValue === null) return -1 * dir;
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * dir;
    }

    return String(leftValue).localeCompare(String(rightValue), 'ar') * dir;
  });
};

export const buildNewAccountForm = (): AccountDialogForm => ({
  employee_id: null,
  app_id: '',
  account_username: '',
  account_id_on_platform: '',
  iqama_number: '',
  iqama_expiry_date: '',
  status: 'active',
  notes: '',
});
