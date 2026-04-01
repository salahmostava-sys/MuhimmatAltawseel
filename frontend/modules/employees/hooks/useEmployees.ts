import { useMemo } from 'react';
import { useEmployees } from '@shared/hooks/useEmployees';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { filterVisibleEmployeesInMonth } from '@shared/lib/employeeVisibility';
import { useTemporalContext } from '@app/providers/TemporalContext';
import type { Employee } from '@modules/employees/model/employeeUtils';

export function useEmployeesData() {
  const { selectedMonth } = useTemporalContext();
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(selectedMonth);
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
