import { AlertTriangle, Target, TrendingDown, TrendingUp, Trophy, Users, type LucideIcon } from 'lucide-react';

import type { PerformanceAlert, PerformanceDashboardResponse } from '@services/performanceService';

function formatPercent(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
}

/** Extract only the first two names from a full name */
function getFirstTwoNames(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

function alertLabel(alert: PerformanceAlert) {
  switch (alert.alertType) {
    case 'declining':
      return 'انخفاض واضح عن الشهر السابق';
    case 'inactive_recently':
      return 'اختفى في آخر 3 أيام';
    case 'below_target':
      return 'أقل من الهدف الشهري';
    case 'low_consistency':
      return 'أداء غير مستقر';
    default:
      return alert.alertType;
  }
}

function StatCard(props: Readonly<{
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: 'default' | 'good' | 'bad';
}>) {
  const { label, value, sub, icon: Icon, tone = 'default' } = props;
  const toneClass =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'bad'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-muted/40 text-foreground';

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div className="mt-3">
        <p className="text-xl font-black text-foreground leading-tight">{value}</p>
        <p className="text-xs font-semibold text-foreground/75 mt-2">{label}</p>
        {sub ? <p className="text-[11px] text-muted-foreground mt-1">{sub}</p> : null}
      </div>
    </div>
  );
}

function ComparisonCard(props: Readonly<{
  title: string;
  currentValue: string;
  previousValue: string;
  change: number;
  hint: string;
}>) {
  const { title, currentValue, previousValue, change, hint } = props;
  const positive = change >= 0;
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-foreground">{currentValue}</p>
          <p className="text-[11px] text-muted-foreground">السابق: {previousValue}</p>
        </div>
        <div className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {positive ? <TrendingUp size={14} className="inline me-1" /> : <TrendingDown size={14} className="inline me-1" />}
          {formatPercent(change)}
        </div>
      </div>
    </div>
  );
}

function AppCard(props: Readonly<{
  appName: string;
  orders: number;
  riders: number;
  targetOrders: number;
  targetAchievementPct: number;
  growthPct: number;
  brandColor: string;
  textColor: string;
}>) {
  const { appName, orders, riders, targetOrders, targetAchievementPct, growthPct, brandColor, textColor } = props;
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: brandColor, color: textColor }}
        >
          {appName}
        </span>
        <span className={`text-xs font-bold ${growthPct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {formatPercent(growthPct)}
        </span>
      </div>
      <p className="text-2xl font-black text-foreground">{orders.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {riders} مندوب • الهدف {targetOrders.toLocaleString()} • {targetAchievementPct.toFixed(0)}%
      </p>
    </div>
  );
}

export function DashboardPerformanceOverviewTab(props: Readonly<{
  loading: boolean;
  dashboard: PerformanceDashboardResponse | null;
}>) {
  const { loading, dashboard } = props;

  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="bg-card rounded-2xl h-32 animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  const { summary, comparison, distribution, ordersByApp, ordersByCity, rankings, alerts, targets } = dashboard;
  const bestToday = summary.topPerformerToday?.employeeName ? getFirstTwoNames(summary.topPerformerToday.employeeName) : 'لا يوجد';
  const bestTodayOrders = summary.topPerformerToday?.totalOrders ?? 0;
  const lowMonth = summary.lowPerformerMonth?.employeeName ? getFirstTwoNames(summary.lowPerformerMonth.employeeName) : 'لا يوجد';
  const lowMonthOrders = summary.lowPerformerMonth?.totalOrders ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard
          label="إجمالي الطلبات"
          value={summary.totalOrders.toLocaleString()}
          sub={`مقارنة بالشهر السابق ${formatPercent(comparison.month.growthPct)}`}
          icon={Target}
        />
        <StatCard
          label="متوسط الطلبات لكل مندوب"
          value={summary.avgOrdersPerRider.toFixed(1)}
          sub={`${summary.activeRiders} مندوب نشط`}
          icon={Users}
        />
        <StatCard
          label="تحقيق الهدف"
          value={`${targets.targetAchievementPct.toFixed(0)}%`}
          sub={`الهدف الشهري ${targets.totalTargetOrders.toLocaleString()} طلب`}
          icon={Trophy}
          tone={targets.targetAchievementPct >= 100 ? 'good' : 'default'}
        />
        <StatCard
          label="أفضل مندوب اليوم"
          value={bestToday}
          sub={`${bestTodayOrders.toLocaleString()} طلب في آخر يوم نشاط`}
          icon={TrendingUp}
          tone="good"
        />
        <StatCard
          label="أضعف أداء"
          value={lowMonth}
          sub={`${lowMonthOrders.toLocaleString()} طلب هذا الشهر`}
          icon={TrendingDown}
          tone="bad"
        />
        <StatCard
          label="تنبيهات ذكية"
          value={alerts.length.toLocaleString()}
          sub={alerts[0] ? alertLabel(alerts[0]) : 'لا توجد تنبيهات حالياً'}
          icon={AlertTriangle}
          tone={alerts.length > 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ComparisonCard
          title="الشهر الحالي مقابل السابق"
          currentValue={comparison.month.currentOrders.toLocaleString()}
          previousValue={comparison.month.previousOrders.toLocaleString()}
          change={comparison.month.growthPct}
          hint={`أيام العمل: ${comparison.month.currentActiveDays} مقابل ${comparison.month.previousActiveDays}`}
        />
        <ComparisonCard
          title="الأسبوع الحالي مقابل السابق"
          currentValue={comparison.week.currentOrders.toLocaleString()}
          previousValue={comparison.week.previousOrders.toLocaleString()}
          change={comparison.week.growthPct}
          hint="قراءة سريعة لتغيّر الزخم"
        />
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-sm font-bold text-foreground">توزيع الأداء</p>
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>ممتاز</span>
              <span className="font-black text-emerald-600">{distribution.excellent}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>متوسط</span>
              <span className="font-black text-amber-600">{distribution.average}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>ضعيف</span>
              <span className="font-black text-rose-500">{distribution.weak}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,0.8fr] gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">أداء المنصات</h3>
              <p className="text-[11px] text-muted-foreground mt-1">طلبات الشهر الحالية مع نسبة التغيّر والهدف</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{ordersByApp.length} منصة</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ordersByApp.map((app) => (
              <AppCard key={app.appId} {...app} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-foreground mb-4">حسب المدينة</h3>
            <div className="space-y-3">
              {ordersByCity.map((row) => (
                <div key={row.city} className="rounded-xl bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{row.city}</span>
                  <span className="text-lg font-black text-foreground">{row.orders.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-foreground mb-4">ملخص سريع</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Top Performer</span>
                <span className="font-bold text-foreground">
                  {rankings.topPerformers[0]?.employeeName ?? 'لا يوجد'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Most Improved</span>
                <span className="font-bold text-foreground">
                  {rankings.mostImproved[0]?.employeeName ?? 'لا يوجد'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Most Declined</span>
                <span className="font-bold text-foreground">
                  {rankings.mostDeclined[0]?.employeeName ?? 'لا يوجد'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">التنبيهات الذكية</h3>
            <p className="text-[11px] text-muted-foreground mt-1">أهم الحالات التي تحتاج متابعة الآن</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{alerts.length} تنبيه</span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد تنبيهات حالياً</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.employeeId ?? 'alert'}-${index}`}
                className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{alert.employeeName ?? 'فريق التشغيل'}</p>
                  <span className={`text-[11px] font-bold ${alert.severity === 'high' ? 'text-rose-500' : 'text-amber-600'}`}>
                    {alert.severity === 'high' ? 'عالي' : 'متوسط'}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-2">{alertLabel(alert)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
