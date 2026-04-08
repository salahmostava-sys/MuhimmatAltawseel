import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useTemporalContext } from '@app/providers/TemporalContext';
import { RiderProfilePerformanceCard } from '@modules/dashboard/components/RiderProfilePerformanceCard';
import { performanceService } from '@services/performanceService';
import { getErrorMessage } from '@services/serviceError';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useToast } from '@shared/hooks/use-toast';
import { isOrdersCapableEmployeeWorkType } from '@shared/lib/employeeWorkType';

export function EmployeePerformanceTab(props: Readonly<{ employeeId: string }>) {
  const { employeeId } = props;
  const queryClient = useQueryClient();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { selectedMonth } = useTemporalContext();
  const { toast } = useToast();
  const { permissions } = usePermissions('orders');
  const [monthlyTargetOrders, setMonthlyTargetOrders] = useState('0');
  const [dailyTargetOrders, setDailyTargetOrders] = useState('0');
  const [savingTargets, setSavingTargets] = useState(false);

  const performanceQuery = useQuery({
    queryKey: ['employee-performance', uid, employeeId, selectedMonth] as const,
    enabled,
    staleTime: 60_000,
    queryFn: async () => performanceService.getEmployeePerformanceProfile(employeeId, selectedMonth),
  });

  useEffect(() => {
    if (!performanceQuery.data) return;
    setMonthlyTargetOrders(String(performanceQuery.data.summary.monthlyTargetOrders ?? 0));
    setDailyTargetOrders(String(performanceQuery.data.summary.dailyTargetOrders ?? 0));
  }, [performanceQuery.data]);

  const handleSaveTargets = async () => {
    setSavingTargets(true);
    try {
      await performanceService.upsertEmployeeTarget({
        employeeId,
        monthYear: selectedMonth,
        monthlyTargetOrders: Math.max(Number(monthlyTargetOrders) || 0, 0),
        dailyTargetOrders: Math.max(Number(dailyTargetOrders) || 0, 0),
      });
      await queryClient.invalidateQueries({ queryKey: ['employee-performance', uid, employeeId, selectedMonth] });
      await queryClient.invalidateQueries({ queryKey: ['performance-dashboard', uid, selectedMonth] });
      toast({ title: 'تم حفظ الهدف', description: 'تم تحديث أهداف الموظف لهذا الشهر' });
    } catch (error) {
      toast({
        title: 'تعذر حفظ الهدف',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSavingTargets(false);
    }
  };

  if (performanceQuery.isLoading) {
    return <div className="bg-card rounded-2xl h-72 animate-pulse shadow-card" />;
  }

  if (performanceQuery.isError || !performanceQuery.data) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">
        تعذر تحميل تحليل الأداء.
      </div>
    );
  }

  const canManageTargets = isOrdersCapableEmployeeWorkType(performanceQuery.data.summary.workType);

  return (
    <div className="space-y-4">
      <RiderProfilePerformanceCard data={performanceQuery.data} />

      {canManageTargets ? (
        <div className="bg-card rounded-2xl p-5 shadow-card md:max-w-md">
          <h3 className="mb-4 text-sm font-bold text-foreground">إعدادات الأهداف</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground">الهدف الشهري (عدد الطلبات)</label>
              <Input
                value={monthlyTargetOrders}
                onChange={(event) => setMonthlyTargetOrders(event.target.value)}
                inputMode="numeric"
                disabled={!permissions.can_edit || savingTargets}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">الهدف اليومي</label>
              <Input
                value={dailyTargetOrders}
                onChange={(event) => setDailyTargetOrders(event.target.value)}
                inputMode="numeric"
                disabled={!permissions.can_edit || savingTargets}
              />
            </div>
            {permissions.can_edit ? (
              <Button className="mt-2 w-full" onClick={() => void handleSaveTargets()} disabled={savingTargets}>
                {savingTargets ? 'جارٍ الحفظ...' : 'حفظ الأهداف'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 p-5 text-sm text-muted-foreground shadow-card">
          هذا الموظف يعتمد على الحضور فقط، لذلك لا يتم استخدام أهداف الطلبات له في هذا التبويب.
        </div>
      )}
    </div>
  );
}
