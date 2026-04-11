import { Calendar, LayoutGrid, Medal, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useTemporalContext } from '@app/providers/TemporalContext';
import { cn } from '@shared/lib/utils';

export type DashboardPerformanceTabKey = 'overview' | 'analytics' | 'ranking' | 'platforms';

type DashboardPerformanceHeaderProps = {
  activeTab: DashboardPerformanceTabKey;
  onTabChange: (tab: DashboardPerformanceTabKey) => void;
  onPrefetchIntent?: () => void;
};

const TAB_LABELS: Record<DashboardPerformanceTabKey, string> = {
  overview: 'النظرة العامة',
  analytics: 'التحليلات',
  ranking: 'التصنيف',
  platforms: 'المنصات',
};

export function DashboardPerformanceHeader({
  activeTab,
  onTabChange,
  onPrefetchIntent,
}: Readonly<DashboardPerformanceHeaderProps>) {
  const { selectedMonth } = useTemporalContext();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-1">
            <span>الرئيسية</span>
            <span>/</span>
            <span className="text-muted-foreground font-medium">لوحة التحكم</span>
          </nav>
          <h1 className="text-xl font-black text-foreground">لوحة التحكم</h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
          </p>
        </div>

        <div className="flex items-center bg-muted rounded-xl p-1 gap-1 overflow-x-auto">
          {(['overview', 'analytics', 'ranking', 'platforms'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              onFocus={tab !== 'overview' ? onPrefetchIntent : undefined}
              onMouseEnter={tab !== 'overview' ? onPrefetchIntent : undefined}
              onTouchStart={tab !== 'overview' ? onPrefetchIntent : undefined}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap',
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/75',
              )}
            >
              {tab === 'analytics' ? <TrendingUp size={13} /> : null}
              {tab === 'ranking' ? <Medal size={13} /> : null}
              {tab === 'platforms' ? <LayoutGrid size={13} /> : null}
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
          <Calendar size={14} className="text-primary/70" />
          <span>بيانات شهر:</span>
          <span className="text-foreground font-bold">
            {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ar })}
          </span>
        </div>


      </div>
    </div>
  );
}
