import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTemporalContext } from '@app/providers/TemporalContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { performanceService } from '@services/performanceService';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { useToast } from '@shared/hooks/use-toast';
import { usePermissions } from '@shared/hooks/usePermissions';
import { getErrorMessage } from '@services/serviceError';

function judgmentLabel(code: string) {
  switch (code) {
    case 'excellent_stable':
      return 'مندوب ممتاز ومستقر';
    case 'declining':
      return 'الأداء يتراجع تدريجيًا';
    case 'below_target':
      return 'أقل من الهدف الشهري';
    case 'stable':
      return 'أداء مستقر';
    case 'inactive':
      return 'لا توجد حركة هذا الشهر';
    default:
      return 'أداء متوسط';
  }
}

function trendLabel(code: string) {
  switch (code) {
    case 'up':
      return 'يتحسن';
    case 'down':
      return 'يتراجع';
    default:
      return 'ثابت';
  }
}

function alertLabel(code: string) {
  switch (code) {
    case 'declining':
      return 'انخفاض واضح عن الشهر السابق';
    case 'inactive_recently':
      return 'اختفى في آخر 3 أيام';
    case 'below_target':
      return 'أقل من الهدف الشهري';
    case 'low_consistency':
      return 'أداء غير مستقر';
    default:
      return code;
  }
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
}

function MetricCard(props: Readonly<{ label: string; value: string; sub?: string }>) {
  const { label, value, sub } = props;
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-foreground mt-2">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-2">{sub}</p> : null}
    </div>
  );
}

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
    queryFn: async () => performanceService.getRiderProfile(employeeId, selectedMonth),
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
      toast({ title: 'تم حفظ الهدف', description: 'تم تحديث أهداف المندوب لهذا الشهر' });
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

  const performance = performanceQuery.data;
  const salary = performance.salary;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="إجمالي الطلبات"
          value={performance.summary.totalOrders.toLocaleString()}
          sub={`الترتيب ${performance.summary.rank || '-'} / ${performance.summary.rankOutOf || '-'}`}
        />
        <MetricCard
          label="المتوسط اليومي"
          value={performance.summary.avgOrdersPerDay.toFixed(1)}
          sub={`أيام العمل ${performance.summary.activeDays}`}
        />
        <MetricCard
          label="الاستقرار"
          value={`${(performance.summary.consistencyRatio * 100).toFixed(0)}%`}
          sub={trendLabel(performance.trend.trendCode)}
        />
        <MetricCard
          label="تحقيق الهدف"
          value={`${performance.summary.targetAchievementPct.toFixed(0)}%`}
          sub={`الهدف الشهري ${performance.summary.monthlyTargetOrders.toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">المقارنة الشهرية</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>الطلبات</span>
              <span className="font-bold text-foreground">
                {performance.comparison.month.currentOrders.toLocaleString()} / {performance.comparison.month.previousOrders.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>متوسط يومي</span>
              <span className="font-bold text-foreground">
                {performance.comparison.month.currentAvgOrdersPerDay.toFixed(1)} / {performance.comparison.month.previousAvgOrdersPerDay.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>أيام العمل</span>
              <span className="font-bold text-foreground">
                {performance.comparison.month.currentActiveDays} / {performance.comparison.month.previousActiveDays}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">المقارنة الأسبوعية</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>هذا الأسبوع</span>
              <span className="font-bold text-foreground">{performance.comparison.week.currentOrders.toLocaleString()} طلب</span>
            </div>
            <div className="flex items-center justify-between">
              <span>الأسبوع السابق</span>
              <span className="font-bold text-foreground">{performance.comparison.week.previousOrders.toLocaleString()} طلب</span>
            </div>
            <div className="flex items-center justify-between">
              <span>التغير</span>
              <span className={`font-bold ${performance.comparison.week.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {performance.comparison.week.growthPct >= 0 ? '+' : ''}
                {performance.comparison.week.growthPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">تقييم النظام</h3>
          <p className="text-lg font-black text-foreground">{judgmentLabel(performance.trend.judgmentCode)}</p>
          <p className="text-sm text-muted-foreground mt-3">
            الحالة الحالية: {trendLabel(performance.trend.trendCode)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">آخر 3 شهور</h3>
            <p className="text-[11px] text-muted-foreground mt-1">مقارنة مباشرة لحجم الأداء</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={performance.lastThreeMonths.map((row) => ({
                ...row,
                label: monthLabel(row.monthYear),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="totalOrders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">اتجاه الأيام الأخيرة</h3>
            <p className="text-[11px] text-muted-foreground mt-1">الأداء اليومي حتى نهاية الشهر المحدد</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={performance.recentDailyOrders.map((row) => ({
                ...row,
                label: row.date.slice(5),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">تفصيل المنصات</h3>
          <div className="space-y-3">
            {performance.platformBreakdown.map((platform) => (
              <div key={platform.appId} className="rounded-xl border border-border/60 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.brandColor }}
                  />
                  <span className="text-sm font-bold text-foreground truncate">{platform.appName}</span>
                </div>
                <span className="text-lg font-black text-foreground">{platform.orders.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-foreground mb-4">الأهداف</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground">الهدف الشهري</label>
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
                <Button className="w-full" onClick={() => void handleSaveTargets()} disabled={savingTargets}>
                  {savingTargets ? 'جارٍ الحفظ...' : 'حفظ الأهداف'}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-foreground mb-4">الفلوس</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>إجمالي الدخل</span>
                <span className="font-bold text-foreground">{salary?.baseSalary?.toLocaleString() ?? '0'} ر.س</span>
              </div>
              <div className="flex items-center justify-between">
                <span>البدلات</span>
                <span className="font-bold text-foreground">{salary?.allowances?.toLocaleString() ?? '0'} ر.س</span>
              </div>
              <div className="flex items-center justify-between">
                <span>الخصومات</span>
                <span className="font-bold text-foreground">
                  {(
                    (salary?.attendanceDeduction ?? 0)
                    + (salary?.advanceDeduction ?? 0)
                    + (salary?.externalDeduction ?? 0)
                    + (salary?.manualDeduction ?? 0)
                  ).toLocaleString()} ر.س
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span>الصافي</span>
                <span className="text-lg font-black text-foreground">{salary?.netSalary?.toLocaleString() ?? '0'} ر.س</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card">
        <h3 className="text-sm font-bold text-foreground mb-4">المشاكل والتنبيهات</h3>
        {performance.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد مشاكل حالياً</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {performance.alerts.map((alert, index) => (
              <div key={`${alert.alertType}-${index}`} className="rounded-xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{alertLabel(alert.alertType)}</p>
                  <span className={`text-[11px] font-bold ${alert.severity === 'high' ? 'text-rose-500' : 'text-amber-600'}`}>
                    {alert.severity === 'high' ? 'عالي' : 'متوسط'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
