/**
 * AI-Powered Analytics Dashboard Panel
 *
 * Displays: Orders Forecast, Top Platform, Best Driver, Smart Alerts
 * Uses Recharts for visualization.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Trophy,
  AlertTriangle,
  Zap,
  Crown,
  Activity,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import type { OrdersPrediction, DriverRank, PlatformRank, SmartAlert } from '@services/aiService';

// ─── Props ───────────────────────────────────────────────────────────────────

interface AiDashboardPanelProps {
  isLoading: boolean;
  predictions: OrdersPrediction | null;
  bestDrivers: DriverRank[];
  topPlatforms: PlatformRank[];
  smartAlerts: SmartAlert[];
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-amber-500" />;
};

const trendColor = (trend: string) =>
  trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-amber-500';

const confidenceBadge = (confidence: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'دقة عالية' },
    medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'دقة متوسطة' },
    low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'دقة منخفضة' },
  };
  const c = map[confidence] || map.low;
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', c.bg, c.text)}>{c.label}</span>;
};

const severityIcon = (severity: string) => {
  if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Zap className="h-4 w-4 text-blue-500" />;
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton({ title: _title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-xl bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted/60" />
        <div className="h-3 w-3/4 rounded bg-muted/60" />
        <div className="h-24 w-full rounded bg-muted/40" />
      </div>
    </div>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function OrdersForecastCard({ data }: { data: OrdersPrediction }) {
  const chartData = useMemo(
    () =>
      data.daily_forecast.map((d) => ({
        date: d.date.slice(5), // MM-DD
        orders: d.predicted_orders,
      })),
    [data.daily_forecast],
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-indigo-500/5 via-card to-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">توقعات الطلبات</h3>
            <p className="text-[10px] text-muted-foreground">تنبؤ الأيام القادمة</p>
          </div>
        </div>
        {confidenceBadge(data.confidence)}
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
          {Math.round(data.monthly_total_predicted).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">طلب متوقع</span>
        <div className={cn('flex items-center gap-1 text-xs font-bold', trendColor(data.trend))}>
          <TrendIcon trend={data.trend} />
          <span>{data.trend_percent > 0 ? '+' : ''}{data.trend_percent}%</span>
        </div>
      </div>

      <div className="h-32 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={35} />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              name="طلبات متوقعة"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopPlatformCard({ platforms }: { platforms: PlatformRank[] }) {
  const chartData = useMemo(
    () =>
      platforms.slice(0, 5).map((p) => ({
        name: p.app_name,
        orders: p.total_orders,
        share: p.share_percent,
      })),
    [platforms],
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-violet-500/5 via-card to-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <Trophy className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">أفضل المنصات</h3>
          <p className="text-[10px] text-muted-foreground">ترتيب حسب حجم الطلبات</p>
        </div>
      </div>

      {platforms.length > 0 && (
        <div className="h-28 -mx-1 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10 }}
                stroke="var(--muted-foreground)"
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="طلبات" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="space-y-1.5">
        {platforms.slice(0, 3).map((p, i) => (
          <li key={p.app_name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className="font-semibold">{p.app_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{p.share_percent}%</span>
              <span className={cn('font-bold', p.growth_percent >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {p.growth_percent > 0 ? '+' : ''}{p.growth_percent}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BestDriverCard({ drivers }: { drivers: DriverRank[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-500/5 via-card to-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
          <Crown className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">أفضل المناديب</h3>
          <p className="text-[10px] text-muted-foreground">حسب الأداء والاستمرارية</p>
        </div>
      </div>

      <ul className="space-y-2">
        {drivers.slice(0, 5).map((d, i) => (
          <li key={d.employee_id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full font-bold text-[10px]',
                i === 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : i === 1
                    ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    : i === 2
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold truncate block">{d.employee_name}</span>
              <span className="text-muted-foreground">
                {d.total_orders} طلب • {d.daily_avg}/يوم • ثبات {d.consistency_score}%
              </span>
            </div>
            <div className={cn('flex items-center gap-0.5', trendColor(d.trend))}>
              <TrendIcon trend={d.trend} />
              <span className="text-[10px] font-bold">
                {d.trend_percent > 0 ? '+' : ''}{d.trend_percent}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmartAlertsCard({ alerts }: { alerts: SmartAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
          <h3 className="text-sm font-bold text-foreground">التنبيهات الذكية</h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          ✅ لا توجد تنبيهات — الأداء مستقر
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-amber-500/5 via-card to-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">التنبيهات الذكية</h3>
          <p className="text-[10px] text-muted-foreground">{alerts.length} تنبيه مكتشف تلقائياً</p>
        </div>
      </div>

      <ul className="space-y-2 max-h-40 overflow-y-auto">
        {alerts.map((alert, i) => (
          <li
            key={`${alert.type}-${i}`}
            className={cn(
              'flex items-start gap-2 text-xs p-2 rounded-lg',
              alert.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-900/10'
                : alert.severity === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-900/10'
                  : 'bg-blue-50 dark:bg-blue-900/10',
            )}
          >
            {severityIcon(alert.severity)}
            <span className="flex-1">{alert.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function AiDashboardPanel({
  isLoading,
  predictions,
  bestDrivers,
  topPlatforms,
  smartAlerts,
  className,
}: AiDashboardPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
        <CardSkeleton title="توقعات الطلبات" />
        <CardSkeleton title="أفضل المنصات" />
        <CardSkeleton title="أفضل المناديب" />
        <CardSkeleton title="التنبيهات الذكية" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-black text-foreground">التحليلات الذكية</h2>
          <p className="text-[11px] text-muted-foreground">تنبؤات وتحليلات مدعومة بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions && <OrdersForecastCard data={predictions} />}
        <TopPlatformCard platforms={topPlatforms} />
        <BestDriverCard drivers={bestDrivers} />
        <SmartAlertsCard alerts={smartAlerts} />
      </div>
    </div>
  );
}
