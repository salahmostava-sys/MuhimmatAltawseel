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

  const allEmployees = useMemo(
    () => (employeesData as Employee[]) ?? [],
    [employeesData],
  );

  const visibleEmployees = useMemo(
    () => filterVisibleEmployeesInMonth(allEmployees, activeEmployeeIdsInMonth),
    [allEmployees, activeEmployeeIdsInMonth],
  );

  return {
    employees: visibleEmployees,
    allEmployees,
    activeEmployeeIdsInMonth,
    isLoading,
    error,
    refetch,
  };
}
