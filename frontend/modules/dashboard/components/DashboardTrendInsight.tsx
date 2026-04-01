import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@shared/lib/utils';

type Insight = { id: string; tone: 'warning' | 'info'; text: string };

type DashboardTrendInsightProps = Readonly<{
  loading: boolean;
  orderGrowth: number;
  prevMonthOrders: number;
  absentToday: number;
  lateToday: number;
  activeAlerts: number;
  className?: string;
}>;

function buildInsights(p: Omit<DashboardTrendInsightProps, 'loading' | 'className'>): Insight[] {
  const out: Insight[] = [];

  if (p.prevMonthOrders > 0 && Math.abs(p.orderGrowth) >= 25) {
    out.push({
      id: 'orders-swing',
      tone: p.orderGrowth > 0 ? 'info' : 'warning',
      text:
        p.orderGrowth > 0
          ? `تقلّب كبير في الطلبات: نمو حوالي ${p.orderGrowth.toFixed(0)}٪ عن الشهر السابق — راقب التشغيل والمخزون.`
          : `تقلّب كبير في الطلبات: تراجع حوالي ${Math.abs(p.orderGrowth).toFixed(0)}٪ عن الشهر السابق — راجع الأسباب والمنصات.`,
    });
  }

  if (p.activeAlerts >= 8) {
    out.push({
      id: 'alerts-high',
      tone: 'warning',
      text: `عدد مرتفع من التنبيهات غير المحلولة (${p.activeAlerts.toLocaleString('ar-SA')}) — يُفضّل المعالجة اليوم.`,
    });
  }

  if (p.absentToday >= 5) {
    out.push({
      id: 'absence-high',
      tone: 'warning',
      text: `غياب متعدد اليوم (${p.absentToday.toLocaleString('ar-SA')}) — قد يؤثر على التغطية.`,
    });
  }

  if (p.lateToday >= 8) {
    out.push({
      id: 'late-high',
      tone: 'warning',
      text: `تأخر متكرر اليوم (${p.lateToday.toLocaleString('ar-SA')}) — راجع جداول الحضور.`,
    });
  }

  return out.slice(0, 3);
}

export function DashboardTrendInsight({
  loading,
  orderGrowth,
  prevMonthOrders,
  absentToday,
  lateToday,
  activeAlerts,
  className,
}: DashboardTrendInsightProps) {
  const insights = buildInsights({ orderGrowth, prevMonthOrders, absentToday, lateToday, activeAlerts });

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border/50 bg-muted/20 p-4 animate-pulse h-20', className)} />
    );
  }

  if (insights.length === 0) return null;

  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800/50 p-4',
        className,
      )}
      role="status"
    >
      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden />
        تنبيهات تشغيلية
      </p>
      <ul className="space-y-2">
        {insights.map((ins) => (
          <li
            key={ins.id}
            className={cn(
              'flex gap-2 text-sm leading-relaxed',
              ins.tone === 'warning' ? 'text-amber-900 dark:text-amber-100' : 'text-foreground/90',
            )}
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5 opacity-70" aria-hidden />
            <span>{ins.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
