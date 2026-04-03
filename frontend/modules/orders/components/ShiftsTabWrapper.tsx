import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { shiftService } from '@services/shiftService';
import { orderService } from '@services/orderService';
import { ShiftsTab, type ShiftRow } from '@modules/orders/components/ShiftsTab';
import { shiftMonth } from '@modules/orders/utils/dateMonth';

export function ShiftsTabWrapper() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('orders');
  const { selectedMonth: globalMonth } = useTemporalContext();
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

  // Fetch shifts for current month
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', 'month', globalMonth, uid],
    queryFn: () => shiftService.getByMonth(globalMonth),
    enabled,
  });

  const handlePrevMonth = useCallback(() => {
    const n = shiftMonth(year, month, -1);
    queryClient.setQueryData(['temporal', 'selectedMonth'], `${n.y}-${String(n.m).padStart(2, '0')}`);
  }, [year, month, queryClient]);

  const handleNextMonth = useCallback(() => {
    const n = shiftMonth(year, month, 1);
    queryClient.setQueryData(['temporal', 'selectedMonth'], `${n.y}-${String(n.m).padStart(2, '0')}`);
  }, [year, month, queryClient]);

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
        await queryClient.invalidateQueries({ queryKey: ['shifts'] });
        toast.success('تم حفظ بيانات الدوام بنجاح');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل حفظ البيانات';
        toast.error('خطأ', { description: message });
        throw error;
      }
    },
    [queryClient]
  );

  return (
    <ShiftsTab
      year={year}
      month={month}
      shifts={shifts}
      employees={employees}
      apps={apps}
      loading={isLoading}
      onPrevMonth={handlePrevMonth}
      onNextMonth={handleNextMonth}
      onSave={handleSave}
      canEdit={permissions.can_edit}
    />
  );
}
