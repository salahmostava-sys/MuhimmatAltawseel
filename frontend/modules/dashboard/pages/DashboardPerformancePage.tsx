import { useMemo, useState, type ComponentType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock3, Package, TrendingUp, Users, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useTemporalContext } from '@app/providers/TemporalContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { REALTIME_TABLES_DASHBOARD, useRealtimePostgresChanges } from '@shared/hooks/useRealtimePostgresChanges';
import { getEmployeeWorkTypeLabel, type DashboardWorkTypeFilter } from '@shared/lib/employeeWorkType';
import { AIChatWidget } from '@modules/dashboard/components/AIChatWidget';
import { performanceService, type DashboardEmployeePerformanceRow } from '@services/performanceService';

const FILTERS: DashboardWorkTypeFilter[] = ['all', 'orders', 'attendance', 'hybrid'];

function SummaryCard(props: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}>) {
  const { label, value, hint, icon: Icon } = props;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function PerformanceTable(props: Readonly<{
  rows: DashboardEmployeePerformanceRow[];
  type: DashboardWorkTypeFilter;
}>) {
  const { rows, type } = props;

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-10 text-center text-sm text-muted-foreground shadow-card">
        لا توجد بيانات لهذا النوع في الشهر الحالي.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      <div className="border-b border-border/50 px-5 py-4">
        <h3 className="text-sm font-bold text-foreground">جدول الأداء</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {rows.length} موظف في التصفية الحالية
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/25 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-start">#</th>
              <th className="px-4 py-3 text-start">الاسم</th>
              {type === 'all' ? <th className="px-4 py-3 text-start">النوع</th> : null}
              {type !== 'attendance' ? <th className="px-4 py-3 text-start">الطلبات</th> : null}
              {type === 'orders' ? <th className="px-4 py-3 text-start">المتوسط</th> : null}
              {type !== 'orders' ? <th className="px-4 py-3 text-start">الحضور</th> : null}
              {type !== 'orders' ? <th className="px-4 py-3 text-start">الغياب</th> : null}
              {type === 'attendance' || type === 'hybrid' || type === 'all' ? (
                <th className="px-4 py-3 text-start">الالتزام</th>
              ) : null}
              {type !== 'attendance' ? <th className="px-4 py-3 text-start">الهدف</th> : null}
              <th className="px-4 py-3 text-start">الراتب</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-t border-border/40">
                <td className="px-4 py-3 font-bold text-muted-foreground">{row.rank}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.employeeName}</p>
                    {row.city ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{row.city}</p>
                    ) : null}
                  </div>
                </td>
                {type === 'all' ? (
                  <td className="px-4 py-3 text-foreground">{getEmployeeWorkTypeLabel(row.workType)}</td>
                ) : null}
                {type !== 'attendance' ? (
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {row.totalOrders.toLocaleString('ar-SA')}
                  </td>
                ) : null}
                {type === 'orders' ? (
                  <td className="px-4 py-3 text-foreground">{row.avgOrdersPerDay.toFixed(1)}</td>
                ) : null}
                {type !== 'orders' ? (
                  <td className="px-4 py-3 text-foreground">{row.daysPresent}</td>
                ) : null}
                {type !== 'orders' ? (
                  <td className="px-4 py-3 text-foreground">{row.daysAbsent}</td>
                ) : null}
                {type === 'attendance' || type === 'hybrid' || type === 'all' ? (
                  <td className="px-4 py-3 text-foreground">{row.attendanceRate.toFixed(1)}%</td>
                ) : null}
                {type !== 'attendance' ? (
                  <td className="px-4 py-3 text-foreground">
                    {row.monthlyTargetOrders > 0 ? `${row.targetAchievementPct.toFixed(0)}%` : '—'}
                  </td>
                ) : null}
                <td className="px-4 py-3 font-semibold text-foreground">
                  {row.salary.toLocaleString('ar-SA')} ر.س
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPerformancePage() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();
  const { selectedMonth: currentMonth } = useTemporalContext();
  const [type, setType] = useState<DashboardWorkTypeFilter>('all');

  useRealtimePostgresChanges('performance-dashboard-realtime', REALTIME_TABLES_DASHBOARD, () => {
    if (!uid) return;
    queryClient.invalidateQueries({ queryKey: ['performance-dashboard', uid, currentMonth] });
  });

  const dashboardQuery = useQuery({
    queryKey: ['performance-dashboard', uid, currentMonth, type] as const,
    enabled,
    staleTime: 60_000,
    queryFn: async () => performanceService.getDashboardData(type, currentMonth),
  });

  const summary = useMemo(() => {
    const rows = dashboardQuery.data ?? [];
    const attendanceRows = rows.filter((row) => row.workType !== 'orders');
    const totalOrders = rows.reduce((sum, row) => sum + row.totalOrders, 0);
    const totalPresentDays = rows.reduce((sum, row) => sum + row.daysPresent, 0);
    const totalPayroll = rows.reduce((sum, row) => sum + row.salary, 0);
    const averageAttendance =
      attendanceRows.length > 0
        ? attendanceRows.reduce((sum, row) => sum + row.attendanceRate, 0) / attendanceRows.length
        : 0;

    return {
      totalEmployees: rows.length,
      totalOrders,
      totalPresentDays,
      totalPayroll,
      averageAttendance,
      topEmployee: rows[0] ?? null,
      typeCounts: {
        orders: rows.filter((row) => row.workType === 'orders').length,
        attendance: rows.filter((row) => row.workType === 'attendance').length,
        hybrid: rows.filter((row) => row.workType === 'hybrid').length,
      },
    };
  }, [dashboardQuery.data]);

  const chatSystemPrompt = useMemo(() => {
    const rows = dashboardQuery.data ?? [];
    return performanceService.buildDashboardPrompt(rows, type, currentMonth);
  }, [currentMonth, dashboardQuery.data, type]);

  const headlineHint = summary.topEmployee
    ? `${summary.topEmployee.employeeName} يتصدر التصفية الحالية`
    : 'لا توجد نتائج حتى الآن';

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-foreground">لوحة أداء الموظفين</h1>
            <p className="mt-1 text-sm text-muted-foreground">{headlineHint}</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
            <Calendar size={14} className="text-primary/70" />
            <span>شهر البيانات</span>
            <span className="text-foreground">
              {format(new Date(`${currentMonth}-01`), 'MMMM yyyy', { locale: ar })}
            </span>
          </div>
        </div>

        <Tabs value={type} onValueChange={(value) => setType(value as DashboardWorkTypeFilter)}>
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter} value={filter} className="gap-1.5">
                {filter === 'orders' ? <Package size={14} /> : null}
                {filter === 'attendance' ? <Clock3 size={14} /> : null}
                {filter === 'hybrid' ? <TrendingUp size={14} /> : null}
                {filter === 'all' ? <Users size={14} /> : null}
                {filter === 'all' ? 'الكل' : getEmployeeWorkTypeLabel(filter)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {dashboardQuery.isError ? (
        <QueryErrorRetry
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
          isFetching={dashboardQuery.isFetching}
          title="تعذر تحميل لوحة الأداء"
          hint="تحقق من الاتصال أو من تطبيق الـ migrations ثم أعد المحاولة."
        />
      ) : null}

      {!dashboardQuery.isError ? (
        <>
          {dashboardQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="bg-card rounded-2xl h-32 animate-pulse shadow-card" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard
                label="عدد الموظفين"
                value={summary.totalEmployees.toLocaleString('ar-SA')}
                hint={`طلبات ${summary.typeCounts.orders} | حضور ${summary.typeCounts.attendance} | مختلط ${summary.typeCounts.hybrid}`}
                icon={Users}
              />
              <SummaryCard
                label="إجمالي الطلبات"
                value={summary.totalOrders.toLocaleString('ar-SA')}
                hint="طلبات الشهر الحالي بعد التصفية"
                icon={Package}
              />
              <SummaryCard
                label="أيام الحضور"
                value={summary.totalPresentDays.toLocaleString('ar-SA')}
                hint={`متوسط الالتزام ${summary.averageAttendance.toFixed(1)}%`}
                icon={Clock3}
              />
              <SummaryCard
                label="إجمالي الرواتب"
                value={`${summary.totalPayroll.toLocaleString('ar-SA')} ر.س`}
                hint="تقديري حسب السجلات أو المعاينة الحالية"
                icon={Wallet}
              />
            </div>
          )}

          {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
            <div className="grid grid-cols-1 xl:grid-cols-[0.85fr,1.15fr] gap-4">
              <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-card">
                <h3 className="text-sm font-bold text-foreground">الأعلى أداءً</h3>
                <div className="mt-4 space-y-3">
                  {(dashboardQuery.data ?? []).slice(0, 5).map((row) => (
                    <div key={row.employeeId} className="flex items-start justify-between gap-3 rounded-xl bg-muted/25 px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{row.employeeName}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {getEmployeeWorkTypeLabel(row.workType)} | {row.message}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-black text-foreground">#{row.rank}</p>
                        <p className="text-[11px] text-muted-foreground">{row.performanceScore}/100</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <PerformanceTable rows={dashboardQuery.data ?? []} type={type} />
            </div>
          ) : null}
        </>
      ) : null}

      {chatSystemPrompt ? <AIChatWidget systemPrompt={chatSystemPrompt} /> : null}
    </div>
  );
}
