import { Sparkles } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import type { DashboardExportKpis } from '@modules/dashboard/types/dashboardExportKpis';
import { buildDashboardAiSummaryLines } from '@modules/dashboard/lib/dashboardAiSummary';

type DashboardAiSummaryCardProps = Readonly<{
  loading: boolean;
  kpis: DashboardExportKpis;
  orderGrowth: number;
  className?: string;
}>;

export function DashboardAiSummaryCard({ loading, kpis, orderGrowth, className }: DashboardAiSummaryCardProps) {
  const lines = buildDashboardAiSummaryLines(kpis, orderGrowth);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">ملخص سريع</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">استنتاجات قواعد من مؤشرات الشهر — ليست تنبؤاً آلياً.</p>
        </div>
      </div>
      {loading ? (
        <ul className="space-y-2">
          {['a', 'b', 'c'].map((k) => (
            <li key={k} className="h-4 rounded bg-muted/50 animate-pulse" />
          ))}
        </ul>
      ) : (
        <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground/90 leading-relaxed marker:text-primary">
          {lines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
