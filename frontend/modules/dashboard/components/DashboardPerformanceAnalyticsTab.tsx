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

import type { PerformanceDashboardResponse } from '@services/performanceService';

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
}

export function DashboardPerformanceAnalyticsTab(props: Readonly<{
  dashboard: PerformanceDashboardResponse | null;
}>) {
  const { dashboard } = props;

  if (!dashboard) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-card rounded-2xl h-80 animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  const monthlyTrend = dashboard.monthlyTrend.map((row) => ({
    ...row,
    label: monthLabel(row.monthYear),
  }));
  const dailyTrend = dashboard.dailyTrend.map((row) => ({
    ...row,
    label: row.date.slice(5),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">اتجاه الأداء الشهري</h3>
            <p className="text-[11px] text-muted-foreground mt-1">إجمالي الطلبات ومتوسط كل مندوب خلال آخر 6 أشهر</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTrend}>
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
            <h3 className="text-sm font-bold text-foreground">اتجاه الطلبات اليومي</h3>
            <p className="text-[11px] text-muted-foreground mt-1">قراءة سريعة لزخم الشهر الحالي يومًا بيوم</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,0.7fr] gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">مقارنة المنصات</h3>
            <p className="text-[11px] text-muted-foreground mt-1">من الأكثر نموًا ومن يتراجع هذا الشهر</p>
          </div>
          <div className="space-y-3">
            {dashboard.ordersByApp.map((app) => (
              <div key={app.appId} className="rounded-xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: app.brandColor }}
                    />
                    <span className="text-sm font-bold text-foreground">{app.appName}</span>
                  </div>
                  <span className={`text-sm font-bold ${app.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {app.growthPct >= 0 ? '+' : ''}
                    {app.growthPct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-muted-foreground mt-2">
                  <span>{app.orders.toLocaleString()} طلب</span>
                  <span>{app.riders} مندوب</span>
                  <span>{app.targetAchievementPct.toFixed(0)}% من الهدف</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">توزيع الأداء</h3>
            <p className="text-[11px] text-muted-foreground mt-1">الفريق الحالي حسب مستوى الأداء</p>
          </div>
          <div className="space-y-4">
            {[
              { key: 'excellent', label: 'ممتاز', value: dashboard.distribution.excellent, color: 'bg-emerald-500' },
              { key: 'average', label: 'متوسط', value: dashboard.distribution.average, color: 'bg-amber-500' },
              { key: 'weak', label: 'ضعيف', value: dashboard.distribution.weak, color: 'bg-rose-500' },
            ].map((row) => {
              const total =
                dashboard.distribution.excellent
                + dashboard.distribution.average
                + dashboard.distribution.weak;
              const width = total > 0 ? (row.value / total) * 100 : 0;
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{row.label}</span>
                    <span className="font-black text-foreground">{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
