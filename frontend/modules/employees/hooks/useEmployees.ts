import { useMemo } from 'react';
import { format } from 'date-fns';
import { useEmployees } from '@shared/hooks/useEmployees';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { filterVisibleEmployeesInMonth } from '@shared/lib/employeeVisibility';
import type { Employee } from '@modules/employees/model/employeeUtils';

/**
 * Employees data for the Employees page.
 * Always uses the CURRENT month for visibility filtering — not affected by the
 * global month selector (TemporalContext). This ensures the employee list stays
 * stable regardless of which month the user is viewing in orders/salaries.
 */
export function useEmployeesData() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(currentMonth);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;

  const {
    data: employeesData = [],
    isLoading,
    error,
    refetch,
  } = useEmployees();

  const visibleEmployees = useMemo(
    () => filterVisibleEmployeesInMonth((employeesData as Employee[]) ?? [], activeEmployeeIdsInMonth),
    [employeesData, activeEmployeeIdsInMonth],
  );

  return {
    employees: visibleEmployees,
    activeEmployeeIdsInMonth,
    isLoading,
    error,
    refetch,
  };
}
