import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock3, Package, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useTemporalContext } from '@app/providers/TemporalContext';
import { useSystemSettings } from '@app/providers/SystemSettingsContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import {
  REALTIME_TABLES_DASHBOARD,
  useRealtimePostgresChanges,
} from '@shared/hooks/useRealtimePostgresChanges';
import {
  getEmployeeWorkTypeLabel,
  type DashboardWorkTypeFilter,
} from '@shared/lib/employeeWorkType';
import {
  DEFAULT_SYSTEM_ADVANCED_CONFIG,
  type SystemAdvancedConfig,
} from '@shared/lib/systemAdvancedConfig';
import { AIChatWidget } from '@modules/dashboard/components/AIChatWidget';
import {
  buildDashboardDecisionSnapshot,
  buildDecisionSystemPrompt,
  getEffectiveMonthlyTarget,
  type DashboardPerformanceBand,
  type DashboardSmartInsight,
} from '@modules/dashboard/lib/smartDecisionSystem';
import { performanceService, type DashboardEmployeePerformanceRow } from '@services/performanceService';

const FILTERS: DashboardWorkTypeFilter[] = ['all', 'orders', 'attendance', 'hybrid'];
const PERFORMANCE_BAND_LABELS: Record<DashboardPerformanceBand, string> = {
  all: 'كل المستويات',
  top: 'Top',
  average: 'Average',
  low: 'Low',
};

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

function getInsightToneClasses(insight: DashboardSmartInsight) {
  if (insight.tone === 'success') {
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  }
  if (insight.tone === 'warning') {
    return 'bg-amber-50 border-amber-200 text-amber-700';
  }
  return 'bg-blue-50 border-blue-200 text-blue-700';
}

function SmartDecisionCard(props: Readonly<{
  title: string;
  subtitle: string;
  insights: DashboardSmartInsight[];
}>) {
  const { title, subtitle, insights } = props;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-card space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          لا توجد قرارات حرجة في التصفية الحالية.
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-2xl border px-4 py-3 ${getInsightToneClasses(insight)}`}
            >
              <p className="text-sm font-bold">{insight.title}</p>
              <p className="mt-1 text-xs leading-6">{insight.summary}</p>
              <p className="mt-2 text-xs font-semibold">الإجراء: {insight.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AwardCard(props: Readonly<{
  title: string;
  employeeName: string;
  metric: string;
  note: string;
}>) {
  const { title, employeeName, metric, note } = props;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-2 text-lg font-black text-foreground">{employeeName}</p>
          <p className="mt-1 text-sm font-semibold text-primary">{metric}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Trophy size={18} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function RankingList(props: Readonly<{
  title: string;
  rows: DashboardEmployeePerformanceRow[];
  emptyLabel: string;
}>) {
  const { title, rows, emptyLabel } = props;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-card">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div key={row.employeeId} className="flex items-start justify-between gap-3 rounded-xl bg-muted/25 px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">{row.employeeName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {getEmployeeWorkTypeLabel(row.workType)} | درجة {row.performanceScore}/100
                </p>
              </div>
              <div className="text-end">
                <p className="text-sm font-black text-foreground">#{index + 1}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.totalOrders.toLocaleString('ar-SA')} طلب
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsCard(props: Readonly<{
  distribution: { top: number; average: number; low: number };
  improvementRate: number;
  bestWeekdayLabel: string;
  bestWeekdayOrders: string;
  payrollLabel: string;
}>) {
  const { distribution, improvementRate, bestWeekdayLabel, bestWeekdayOrders, payrollLabel } = props;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-card space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Advanced Analytics</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          توزيع الأداء والتحسن وأفضل أيام التشغيل داخل التصفية الحالية.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
          <p className="text-[11px] text-emerald-700">Top</p>
          <p className="mt-1 text-xl font-black text-emerald-800">{distribution.top}</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-3 text-center">
          <p className="text-[11px] text-blue-700">Average</p>
          <p className="mt-1 text-xl font-black text-blue-800">{distribution.average}</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
          <p className="text-[11px] text-amber-700">Low</p>
          <p className="mt-1 text-xl font-black text-amber-800">{distribution.low}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">نسبة التحسن</p>
          <p className="mt-1 text-lg font-black text-foreground">
            {improvementRate >= 0 ? '+' : ''}
            {improvementRate.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">أفضل يوم أسبوعي</p>
          <p className="mt-1 text-lg font-black text-foreground">{bestWeekdayLabel}</p>
          <p className="text-[11px] text-muted-foreground">{bestWeekdayOrders}</p>
        </div>
        <div className="rounded-xl border border-border/60 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">إجمالي الرواتب</p>
          <p className="mt-1 text-lg font-black text-foreground">{payrollLabel}</p>
        </div>
      </div>
    </div>
  );
}

function bandLabel(row: DashboardEmployeePerformanceRow, lowThreshold: number) {
  const topThreshold = Math.max(lowThreshold + 20, 85);

  if (row.performanceScore < lowThreshold) return 'Low';
  if (row.performanceScore >= topThreshold) return 'Top';
  return 'Average';
}

function rankVisibleRows(rows: DashboardEmployeePerformanceRow[]): DashboardEmployeePerformanceRow[] {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function PerformanceTable(props: Readonly<{
  rows: DashboardEmployeePerformanceRow[];
  type: DashboardWorkTypeFilter;
  lowThreshold: number;
  currency: string;
  config: SystemAdvancedConfig;
}>) {
  const { rows, type, lowThreshold, currency, config } = props;

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-10 text-center text-sm text-muted-foreground shadow-card">
        لا توجد بيانات لهذه التصفية في الشهر الحالي.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      <div className="border-b border-border/50 px-5 py-4">
        <h3 className="text-sm font-bold text-foreground">جدول الأداء والقرار</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {rows.length} موظف بعد التصفية الحالية
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/25 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-start">#</th>
              <th className="px-4 py-3 text-start">الاسم</th>
              {type === 'all' ? <th className="px-4 py-3 text-start">النوع</th> : null}
              <th className="px-4 py-3 text-start">الطلبات</th>
              <th className="px-4 py-3 text-start">الحضور</th>
              <th className="px-4 py-3 text-start">الهدف</th>
              <th className="px-4 py-3 text-start">الدرجة</th>
              <th className="px-4 py-3 text-start">المستوى</th>
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
                <td className="px-4 py-3 font-semibold text-foreground">
                  {row.totalOrders.toLocaleString('ar-SA')}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {row.daysPresent} / {row.daysPresent + row.daysAbsent}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {getEffectiveMonthlyTarget(row, config) > 0
                    ? `${row.totalOrders.toLocaleString('ar-SA')} / ${getEffectiveMonthlyTarget(row, config).toLocaleString('ar-SA')} (${((row.totalOrders / Math.max(getEffectiveMonthlyTarget(row, config), 1)) * 100).toFixed(0)}%)`
                    : `${row.attendanceRate.toFixed(0)}% التزام`}
                </td>
                <td className="px-4 py-3 text-foreground">{row.performanceScore}/100</td>
                <td className="px-4 py-3 text-foreground">{bandLabel(row, lowThreshold)}</td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {row.salary.toLocaleString('ar-SA')} {currency}
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
  const { settings } = useSystemSettings();
  const advancedConfig = settings?.advancedConfig ?? DEFAULT_SYSTEM_ADVANCED_CONFIG;
  const currencyLabel = advancedConfig.general.currency || 'SAR';
  const previousMonth = format(addMonths(new Date(`${currentMonth}-01`), -1), 'yyyy-MM');

  const [type, setType] = useState<DashboardWorkTypeFilter>('all');
  const [platformId, setPlatformId] = useState('all');
  const [performanceBand, setPerformanceBand] = useState<DashboardPerformanceBand>('all');

  useRealtimePostgresChanges('performance-dashboard-realtime', REALTIME_TABLES_DASHBOARD, () => {
    if (!uid) return;
    queryClient.invalidateQueries({ queryKey: ['performance-dashboard', uid, currentMonth] });
    queryClient.invalidateQueries({ queryKey: ['performance-dashboard', uid, previousMonth] });
  });

  const currentQuery = useQuery({
    queryKey: ['performance-dashboard', uid, currentMonth] as const,
    enabled,
    staleTime: 60_000,
    queryFn: async () => performanceService.getDashboardData('all', currentMonth),
  });

  const previousQuery = useQuery({
    queryKey: ['performance-dashboard', uid, previousMonth] as const,
    enabled,
    staleTime: 60_000,
    queryFn: async () => performanceService.getDashboardData('all', previousMonth),
  });

  const snapshot = useMemo(
    () =>
      buildDashboardDecisionSnapshot({
        rows: currentQuery.data ?? [],
        previousRows: previousQuery.data ?? [],
        config: advancedConfig,
        filterType: type,
        platformId,
        performanceBand,
      }),
    [advancedConfig, currentQuery.data, performanceBand, platformId, previousQuery.data, type],
  );

  const visibleRows = useMemo(
    () => rankVisibleRows(snapshot.filteredRows),
    [snapshot.filteredRows],
  );

  useEffect(() => {
    if (platformId === 'all') return;
    if (snapshot.platformOptions.some((option) => option.id === platformId)) return;
    setPlatformId('all');
  }, [platformId, snapshot.platformOptions]);

  const topRows = useMemo(
    () => visibleRows.slice(0, advancedConfig.ranking.topPerformersCount),
    [advancedConfig.ranking.topPerformersCount, visibleRows],
  );

  const lowRows = useMemo(
    () => [...visibleRows].reverse().slice(0, advancedConfig.ranking.worstPerformersCount),
    [advancedConfig.ranking.worstPerformersCount, visibleRows],
  );

  const totalPayroll = useMemo(
    () => visibleRows.reduce((sum, row) => sum + row.salary, 0),
    [visibleRows],
  );

  const basePrompt = useMemo(
    () => performanceService.buildDashboardPrompt(visibleRows, type, currentMonth),
    [currentMonth, type, visibleRows],
  );

  const decisionPrompt = useMemo(
    () =>
      buildDecisionSystemPrompt({
        rows: visibleRows,
        snapshot,
        monthYear: currentMonth,
        filterType: type,
        platformId,
        performanceBand,
        config: advancedConfig,
      }),
    [advancedConfig, currentMonth, performanceBand, platformId, snapshot, type, visibleRows],
  );

  const chatSystemPrompt = useMemo(() => {
    if (!advancedConfig.ai.enabled || !advancedConfig.ai.chatEnabled) {
      return '';
    }

    return [basePrompt, decisionPrompt].filter(Boolean).join('\n\n');
  }, [advancedConfig.ai.chatEnabled, advancedConfig.ai.enabled, basePrompt, decisionPrompt]);

  const headlineHint = visibleRows[0]
    ? `${visibleRows[0].employeeName} يتصدر التصفية الحالية`
    : 'لا توجد نتائج حتى الآن';

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-foreground">Smart Decision Dashboard</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border/60 p-3 shadow-card">
            <p className="text-[11px] text-muted-foreground mb-2">المنصة</p>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المنصات</SelectItem>
                {snapshot.platformOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} ({option.orders.toLocaleString('ar-SA')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-3 shadow-card">
            <p className="text-[11px] text-muted-foreground mb-2">مستوى الأداء</p>
            <Select value={performanceBand} onValueChange={(value) => setPerformanceBand(value as DashboardPerformanceBand)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['all', 'top', 'average', 'low'] as const).map((band) => (
                  <SelectItem key={band} value={band}>
                    {PERFORMANCE_BAND_LABELS[band]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-card">
            <p className="text-[11px] text-muted-foreground">قواعد القرار الحالية</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Low تحت {advancedConfig.alerts.lowPerformanceThreshold}/100
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              التقييم: {advancedConfig.ranking.scoringMode} | أفضل {advancedConfig.ranking.topPerformersCount}
            </p>
          </div>
        </div>
      </div>

      {currentQuery.isError ? (
        <QueryErrorRetry
          error={currentQuery.error}
          onRetry={() => void currentQuery.refetch()}
          isFetching={currentQuery.isFetching}
          title="تعذر تحميل لوحة الأداء"
          hint="تحقق من الاتصال أو من تطبيق الـ migrations ثم أعد المحاولة."
        />
      ) : null}

      {!currentQuery.isError ? (
        <>
          {currentQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="bg-card rounded-2xl h-32 animate-pulse shadow-card" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard
                label="عدد الموظفين"
                value={visibleRows.length.toLocaleString('ar-SA')}
                hint={`Top ${snapshot.distribution.top} | Average ${snapshot.distribution.average} | Low ${snapshot.distribution.low}`}
                icon={Users}
              />
              <SummaryCard
                label="إجمالي الطلبات"
                value={snapshot.targetSummary.achieved.toLocaleString('ar-SA')}
                hint="بعد تطبيق التصفية الحالية"
                icon={Package}
              />
              <SummaryCard
                label="تحقيق الهدف"
                value={`${snapshot.targetSummary.pct.toFixed(0)}%`}
                hint={`${snapshot.targetSummary.achieved.toLocaleString('ar-SA')} / ${snapshot.targetSummary.target.toLocaleString('ar-SA')}`}
                icon={Target}
              />
              <SummaryCard
                label="معدل التحسن"
                value={`${snapshot.improvementRate >= 0 ? '+' : ''}${snapshot.improvementRate.toFixed(1)}`}
                hint={`إجمالي الرواتب ${totalPayroll.toLocaleString('ar-SA')} ${currencyLabel}`}
                icon={TrendingUp}
              />
            </div>
          )}

          {!currentQuery.isLoading ? (
            <>
              {(advancedConfig.dashboard.showSmartDecisions || advancedConfig.dashboard.showAIInsights) ? (
                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-4">
                  <SmartDecisionCard
                    title="Smart Decision System"
                    subtitle="الداشبورد لا يكتفي بعرض الأرقام، بل يقترح الإجراء التالي حسب القواعد الحالية."
                    insights={advancedConfig.dashboard.showSmartDecisions ? snapshot.smartInsights : []}
                  />
                  <AnalyticsCard
                    distribution={snapshot.distribution}
                    improvementRate={snapshot.improvementRate}
                    bestWeekdayLabel={snapshot.bestWeekday?.label ?? 'لا يوجد'}
                    bestWeekdayOrders={
                      snapshot.bestWeekday
                        ? `${snapshot.bestWeekday.totalOrders.toLocaleString('ar-SA')} طلب`
                        : 'لا توجد بيانات كافية'
                    }
                    payrollLabel={`${totalPayroll.toLocaleString('ar-SA')} ${currencyLabel}`}
                  />
                </div>
              ) : null}

              {advancedConfig.dashboard.showRanking ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {snapshot.awards.map((award) => (
                      <AwardCard
                        key={award.id}
                        title={award.title}
                        employeeName={award.employeeName}
                        metric={award.metric}
                        note={award.note}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <RankingList
                      title="أفضل العناصر الآن"
                      rows={topRows}
                      emptyLabel="لا توجد نتائج كافية في التصفية الحالية."
                    />
                    <RankingList
                      title="قائمة المتابعة"
                      rows={lowRows}
                      emptyLabel="لا توجد عناصر منخفضة الآن."
                    />
                  </div>
                </>
              ) : null}

              <PerformanceTable
                rows={visibleRows}
                type={type}
                lowThreshold={advancedConfig.alerts.lowPerformanceThreshold}
                currency={currencyLabel}
                config={advancedConfig}
              />
            </>
          ) : null}
        </>
      ) : null}

      {chatSystemPrompt ? <AIChatWidget systemPrompt={chatSystemPrompt} /> : null}
    </div>
  );
}
