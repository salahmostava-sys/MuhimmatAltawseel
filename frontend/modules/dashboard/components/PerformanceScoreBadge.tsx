/**
 * PerformanceScoreBadge — Colored badge displaying a rider's performance score (0-100).
 */

import {
  classifyPerformance,
  tierLabel,
  tierColorClass,
  tierBgClass,
} from '@modules/dashboard/lib/performanceEngine';

interface PerformanceScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PerformanceScoreBadge({
  score,
  size = 'md',
  showLabel = true,
}: PerformanceScoreBadgeProps) {
  const tier = classifyPerformance(score);
  const color = tierColorClass(tier);
  const bg = tierBgClass(tier);
  const label = tierLabel(tier);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  const labelSize = {
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} ${bg} ${color} rounded-xl flex items-center justify-center font-black`}
      >
        {score}
      </div>
      {showLabel && (
        <span className={`${labelSize[size]} font-bold ${color}`}>{label}</span>
      )}
    </div>
  );
}

/**
 * Inline score ring for table cells — minimal footprint.
 */
export function ScoreRing({ score }: { score: number }) {
  const tier = classifyPerformance(score);
  const color = tierColorClass(tier);
  const bg = tierBgClass(tier);

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black ${bg} ${color}`}
    >
      {score}
    </span>
  );
}
