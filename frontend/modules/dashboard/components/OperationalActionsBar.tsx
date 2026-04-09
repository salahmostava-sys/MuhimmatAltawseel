import { Link } from 'react-router-dom';
import { AlertTriangle, Info, Zap } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import type { OperationalAction } from '@modules/dashboard/lib/operationalActionItems';

const variantClass: Record<OperationalAction['variant'], string> = {
  urgent: 'border-rose-200/80 bg-rose-50/60 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100',
  warning: 'border-amber-200/80 bg-amber-50/60 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-50',
  info: 'border-border bg-muted/30 text-foreground hover:bg-muted/50',
};

const VariantIcon = ({ variant }: { variant: OperationalAction['variant'] }) => {
  if (variant === 'urgent') return <AlertTriangle className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />;
  if (variant === 'warning') return <Zap className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />;
  return <Info className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />;
};

type OperationalActionsBarProps = {
  actions: OperationalAction[];
  loading?: boolean;
};

/** شريط اختصارات تشغيلية تحت بطاقات KPI — يومي/تنبيهات/صفحات حرجة. */
export function OperationalActionsBar({ actions, loading }: OperationalActionsBarProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
        <div className="h-4 w-40 bg-muted/50 rounded animate-pulse mb-3" />
        <div className="flex flex-wrap gap-2">
          {['a', 'b', 'c', 'd'].map((k) => (
            <div key={k} className="h-9 w-28 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm" aria-label="إجراءات تحتاج متابعة">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">متابعة تشغيلية سريعة</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link
            key={a.id}
            to={a.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
              variantClass[a.variant],
            )}
          >
            <VariantIcon variant={a.variant} />
            {a.labelAr}
          </Link>
        ))}
      </div>
    </section>
  );
}
