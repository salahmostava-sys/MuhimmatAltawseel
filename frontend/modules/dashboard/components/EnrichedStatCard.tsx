/**
 * EnrichedStatCard — Stat card that displays a value WITH its comparison delta.
 *
 * Instead of "300 طلب", shows "300 طلب (↑ +15% عن الشهر الماضي)"
 */

import type { LucideIcon } from 'lucide-react';
import {
  type ComparisonResult,
  type PerformanceTier,
  tierColorClass,
  tierBgClass,
} from '@modules/dashboard/lib/performanceEngine';

interface EnrichedStatCardProps {
  label: string;
  value: string;
  delta?: ComparisonResult | null;
  sub?: string;
  icon: LucideIcon;
  tier?: PerformanceTier | null;
}

export function EnrichedStatCard({
  label,
  value,
  delta,
  sub,
  icon: Icon,
  tier,
}: EnrichedStatCardProps) {
  const iconBg = tier ? tierBgClass(tier) : 'bg-muted/40';
  const iconColor = tier ? tierColorClass(tier) : 'text-foreground';

  const deltaClass =
    delta?.direction === '↑'
      ? 'text-emerald-600'
      : delta?.direction === '↓'
        ? 'text-rose-500'
        : 'text-muted-foreground';

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}
        >
          <Icon size={18} />
        </div>
        {delta && (
          <span className={`text-[11px] font-bold ${deltaClass} whitespace-nowrap`}>
            {delta.formattedDelta}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xl font-black text-foreground leading-tight">{value}</p>
        <p className="text-xs font-semibold text-foreground/75 mt-2">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}
