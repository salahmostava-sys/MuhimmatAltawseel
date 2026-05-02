import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { shiftService } from '@services/shiftService';
import { orderService } from '@services/orderService';
import { isShiftCapableApp } from '@shared/lib/workType';
import { ShiftsTab, type ShiftRow } from '@modules/orders/components/ShiftsTab';
import { shiftMonth } from '@modules/orders/utils/dateMonth';
import { getErrorMessage } from '@services/serviceError';

export function ShiftsTabWrapper() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('orders');
  const { selectedMonth: globalMonth, setSelectedMonth } = useTemporalContext();
  const queryClient = useQueryClient();

  const [yearStr, monthStr] = globalMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'base', uid],
    queryFn: () => orderService.getBaseEmployees(),
    enabled,
  });

  // Fetch apps
  const { data: apps = [] } = useQuery({
    queryKey: ['apps', 'active', uid],
    queryFn: () => orderService.getActiveApps(),
    enabled,
  });

  // Fetch employee â†” app assignments
  const { data: employeeApps = [] } = useQuery({
    queryKey: ['employee-apps', uid],
    queryFn: () => orderService.getEmployeeAppAssignments(),
    enabled,
  });

  // Only show employees assigned to shift-capable apps
  const shiftAppIds = useMemo(
    () => new Set(apps.filter(isShiftCapableApp).map((a) => a.id)),
    [apps],
  );
  const shiftEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    employeeApps.forEach((ea) => {
      if (shiftAppIds.has(ea.app_id)) ids.add(ea.employee_id);
    });
    return ids;
  }, [employeeApps, shiftAppIds]);

  const shiftEmployees = useMemo(
    () => employees.filter((e) => shiftEmployeeIds.has(e.id)),
    [employees, shiftEmployeeIds],
  );

  // Fetch shifts for current month
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', 'month', globalMonth, uid],
    queryFn: () => shiftService.getByMonth(globalMonth),
    enabled,
  });

  const handlePrevMonth = useCallback(() => {
    const n = shiftMonth(year, month, -1);
    setSelectedMonth(`${n.y}-${String(n.m).padStart(2, '0')}`);
  }, [year, month, setSelectedMonth]);

  const handleNextMonth = useCallback(() => {
    const n = shiftMonth(year, month, 1);
    setSelectedMonth(`${n.y}-${String(n.m).padStart(2, '0')}`);
  }, [year, month, setSelectedMonth]);

  const handleSave = useCallback(
    async (shiftsData: ShiftRow[]) => {
      try {
        const rows = shiftsData.map((shift) => ({
          employee_id: shift.employee_id,
          app_id: shift.app_id,
          date: shift.date,
          hours_worked: shift.hours_worked,
          notes: shift.notes ?? undefined,
        }));

        await shiftService.bulkUpsert(rows);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['shifts'] }),
          queryClient.invalidateQueries({ queryKey: ['employees', uid, 'active-ids', globalMonth] }),
          queryClient.invalidateQueries({ queryKey: ['salaries', uid, 'context', globalMonth] }),
          queryClient.invalidateQueries({ queryKey: ['salaries', uid, 'preview', globalMonth] }),
        ]);
        toast.success('تم حفظ بيانات الدوام بنجاح');
      } catch (error) {
        const message = getErrorMessage(error, 'فشل حفظ البيانات');
        toast.error('خطأ', { description: message });
        throw error;
      }
    },
    [globalMonth, queryClient, uid]
  );

  return (
    <ShiftsTab
      year={year}
      month={month}
      shifts={shifts.map((s) => {
        const raw = s as Record<string, unknown>;
        return {
          ...s,
          date: String(raw.date ?? raw.date ?? ''),
        };
      }) as ShiftRow[]}
      employees={shiftEmployees}
      allEmployees={employees}
      apps={apps}
      loading={isLoading}
      onPrevMonth={handlePrevMonth}
      onNextMonth={handleNextMonth}
      onSave={handleSave}
      canEdit={permissions.can_edit}
    />
  );
}
