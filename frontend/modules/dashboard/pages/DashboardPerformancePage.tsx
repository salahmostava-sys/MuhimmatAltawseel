import { Suspense, lazy, startTransition, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@app/providers/AuthContext';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { REALTIME_TABLES_DASHBOARD, useRealtimePostgresChanges } from '@shared/hooks/useRealtimePostgresChanges';
import { performanceService } from '@services/performanceService';
import {
  DashboardPerformanceHeader,
  type DashboardPerformanceTabKey,
} from '@modules/dashboard/components/DashboardPerformanceHeader';
import { DashboardPerformanceOverviewTab } from '@modules/dashboard/components/DashboardPerformanceOverviewTab';
import { buildFleetSummary, buildRiderProfiles } from '@modules/dashboard/lib/performanceEngine';
import { buildAIChatSystemPrompt } from '@modules/dashboard/lib/aiInsightsEngine';
import { AIChatWidget } from '@modules/dashboard/components/AIChatWidget';

const loadAnalyticsTab = () =>
  import('@modules/dashboard/components/DashboardPerformanceAnalyticsTab').then((module) => ({
    default: module.DashboardPerformanceAnalyticsTab,
  }));

const loadRankingTab = () =>
  import('@modules/dashboard/components/DashboardRankingTab').then((module) => ({
    default: module.DashboardRankingTab,
  }));

const LazyDashboardPerformanceAnalyticsTab = lazy(loadAnalyticsTab);
const LazyDashboardRankingTab = lazy(loadRankingTab);

function TabFallback() {
  return <div className="bg-card rounded-2xl h-80 animate-pulse shadow-card" />;
}

export default function DashboardPerformancePage() {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();
  const { selectedMonth: currentMonth } = useTemporalContext();
  const [activeTab, setActiveTab] = useState<DashboardPerformanceTabKey>('overview');

  useRealtimePostgresChanges('performance-dashboard-realtime', REALTIME_TABLES_DASHBOARD, () => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['performance-dashboard', uid, currentMonth] });
  });

  const dashboardQuery = useQuery({
    queryKey: ['performance-dashboard', uid, currentMonth] as const,
    enabled,
    staleTime: 60_000,
    queryFn: async () => performanceService.getDashboard(currentMonth),
  });

  // Build AI Chat system prompt from dashboard data
  const chatSystemPrompt = useMemo(() => {
    const data = dashboardQuery.data;
    if (!data) return '';

    try {
      const summary = buildFleetSummary(data);
      const allEntries = [
        ...data.rankings.topPerformers,
        ...data.rankings.lowPerformers,
        ...data.rankings.mostImproved,
        ...data.rankings.mostDeclined,
      ];
      const seen = new Set<string>();
      const unique = allEntries.filter((e) => {
        if (seen.has(e.employeeId)) return false;
        seen.add(e.employeeId);
        return true;
      });
      const profiles = buildRiderProfiles(unique);
      return buildAIChatSystemPrompt(profiles, summary);
    } catch {
      return '';
    }
  }, [dashboardQuery.data]);

  const handleTabChange = (tab: DashboardPerformanceTabKey) => {
    if (tab === 'analytics') {
      void loadAnalyticsTab();
    }
    if (tab === 'ranking') {
      void loadRankingTab();
    }

    startTransition(() => {
      setActiveTab(tab);
    });
  };

  return (
    <div className="space-y-5">
      <DashboardPerformanceHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPrefetchIntent={() => {
          void loadAnalyticsTab();
          void loadRankingTab();
        }}
      />

      {dashboardQuery.isError ? (
        <QueryErrorRetry
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
          isFetching={dashboardQuery.isFetching}
          title="تعذر تحميل لوحة المعلومات"
          hint="تحقق من الاتصال أو من تطبيق أحدث migrations ثم أعد المحاولة."
        />
      ) : null}

      {!dashboardQuery.isError && activeTab === 'overview' ? (
        <DashboardPerformanceOverviewTab
          loading={dashboardQuery.isLoading}
          dashboard={dashboardQuery.data ?? null}
        />
      ) : null}

      {!dashboardQuery.isError && activeTab === 'analytics' ? (
        <Suspense fallback={<TabFallback />}>
          <LazyDashboardPerformanceAnalyticsTab dashboard={dashboardQuery.data ?? null} />
        </Suspense>
      ) : null}

      {!dashboardQuery.isError && activeTab === 'ranking' ? (
        <Suspense fallback={<TabFallback />}>
          <LazyDashboardRankingTab dashboard={dashboardQuery.data ?? null} />
        </Suspense>
      ) : null}

      {/* AI Chat Widget — floating, powered by Groq with real data */}
      {chatSystemPrompt && <AIChatWidget systemPrompt={chatSystemPrompt} />}
    </div>
  );
}
