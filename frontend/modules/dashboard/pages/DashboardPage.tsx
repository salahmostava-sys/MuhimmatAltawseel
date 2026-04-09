import { Suspense, lazy, startTransition, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart2,
} from 'lucide-react';

import { dashboardService } from '@services/dashboardService';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { format } from 'date-fns';
import { useRealtimePostgresChanges, REALTIME_TABLES_DASHBOARD } from '@shared/hooks/useRealtimePostgresChanges';

import { isEmployeeVisibleInMonth } from '@shared/lib/employeeVisibility';
import { getDashboardCityKey, mapDashboardCityLabel } from '@shared/lib/dashboardCity';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { DashboardHeader as DashboardHeaderSection } from '@modules/dashboard/components/DashboardHeader';
import { DashboardOverviewTab } from '@modules/dashboard/components/DashboardOverviewTab';
import { logError } from '@shared/lib/logger';
import {
  useDashboard,
  type EmpDetail,
} from '@modules/dashboard/hooks/useDashboard';

const loadDashboardAnalyticsTab = () =>
  import('@modules/dashboard/components/DashboardAnalyticsTab').then((module) => ({
    default: module.DashboardAnalyticsTab,
  }));

const LazyDashboardAnalyticsTab = lazy(loadDashboardAnalyticsTab);



const parsePositiveIntOrNull = (raw: string) => {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
};

type DashboardTabKey = 'overview' | 'analytics' | 'ranking';

const getCityKey = (city: string | null) => getDashboardCityKey(city);

type DashboardApp = { id: string; name: string; brand_color: string; text_color: string };
type DashboardAttendanceToday = { present?: number; absent?: number; late?: number; leave?: number; sick?: number };
type DashboardOrdersByCityRow = { city: string; orders: number };
type DashboardAttendanceWeekRow = { date: string; present: number; absent: number; late: number; leave: number; sick: number };
type DashboardOrdersByAppRow = {
  app: string;
  orders: number;
  appId: string;
  riders: number;
  brandColor: string;
  textColor: string;
  target: number;
  estRevenue: number;
};

const DASHBOARD_DAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] as const;

const mapOrdersCityLabel = (city: string) => mapDashboardCityLabel(city);

const getAttendanceTodayCounts = (att: DashboardAttendanceToday | null | undefined) => ({
  presentToday: att?.present || 0,
  absentToday: att?.absent || 0,
  lateToday: att?.late || 0,
  leaveToday: att?.leave || 0,
  sickToday: att?.sick || 0,
});

const buildAttendanceWeek = (rows: DashboardAttendanceWeekRow[]) =>
  rows.map((r) => ({ day: DASHBOARD_DAY_NAMES_AR[new Date(`${r.date}T12:00:00`).getDay()], ...r }));

const useDashboardRealtimeInvalidation = (
  userId: string | undefined,
  currentMonth: string,
  queryClient: ReturnType<typeof useQueryClient>
) => {
  useRealtimePostgresChanges('dashboard-realtime', REALTIME_TABLES_DASHBOARD, () => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis', userId, currentMonth] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', userId] });
  });
};

const fetchDashboardKpis = async (
  currentMonth: string,
  activeEmployeeIdsInMonth: ReadonlySet<string> | undefined
) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [rpcResult, employeeAssignmentsResult, supervisorPerformanceResult, additionalMetricsResult, operationalStatsResult] = await Promise.allSettled([
    dashboardService.getOverviewRpc(currentMonth, today),
    dashboardService.getEmployeeAppAssignments(),
    dashboardService.getSupervisorPerformance(currentMonth),
    dashboardService.getAdditionalMetrics(currentMonth),
    dashboardService.getOperationalStats(currentMonth),
  ]);
  if (rpcResult.status === 'rejected') throw rpcResult.reason;
  if (employeeAssignmentsResult.status === 'rejected') throw employeeAssignmentsResult.reason;
  const rpcData = rpcResult.value;
  const employeeAppAssignments = employeeAssignmentsResult.value;
  const supervisorPerformance =
    supervisorPerformanceResult.status === 'fulfilled'
      ? supervisorPerformanceResult.value
      : [];

  if (supervisorPerformanceResult.status === 'rejected') {
    logError(
      '[DashboardPage] supervisor targets are unavailable, continuing without card data.',
      supervisorPerformanceResult.reason,
      { level: 'warn' },
    );
  }

  const additionalMetrics =
    additionalMetricsResult.status === 'fulfilled'
      ? additionalMetricsResult.value
      : { fuelCost: 0, fuelLiters: 0, maintenanceCost: 0, violationsCount: 0, violationsCost: 0, pendingAdvances: 0, totalSalaries: 0 };

  const operationalStats =
    operationalStatsResult.status === 'fulfilled'
      ? operationalStatsResult.value
      : {
          employees: { total: 0, withLicense: 0, appliedLicense: 0, noLicense: 0, byCity: { makkah: 0, jeddah: 0, other: 0 } },
          attendance: { present: 0, absent: 0, late: 0, leave: 0, sick: 0, rate: 0 },
          orders: { total: 0, uniqueRiders: 0, avgPerRider: 0 },
          fuel: { cost: 0, liters: 0, vehiclesRefueled: 0, avgPerVehicle: 0 },
          maintenance: { cost: 0, completed: 0, pending: 0, vehiclesMaintained: 0 },
          vehicles: { total: 0, active: 0, inactive: 0, maintenance: 0 },
          alerts: { unresolved: 0, critical: 0, high: 0, medium: 0 },
        };

  type DashboardRpcShape = {
    apps?: DashboardApp[];
    attendanceToday?: DashboardAttendanceToday;
    empDetails?: EmpDetail[];
    ordersByApp?: DashboardOrdersByAppRow[];
    ordersByCity?: DashboardOrdersByCityRow[];
    riders?: Array<{ name: string; orders: number; app: string; appColor: string; appId: string }>;
    attendanceWeek?: DashboardAttendanceWeekRow[];
    kpis?: {
      estRevenueTotal?: number;
      prevMonthOrders?: number;
      activeVehicles?: number;
      activeAlerts?: number;
      activeApps?: number;
    };
  };
  const rpc = (rpcData === true ? {} : rpcData) as DashboardRpcShape;
  const apps = rpc.apps || [];

  const { presentToday, absentToday, lateToday, leaveToday, sickToday } = getAttendanceTodayCounts(
    rpc.attendanceToday || {}
  );

  const rawEmpDetails = rpc.empDetails || [];
  const empDetails = rawEmpDetails.filter((e) =>
    isEmployeeVisibleInMonth({ id: e.id, sponsorship_status: e.sponsorship_status }, activeEmployeeIdsInMonth)
  );

  const driverIdSet = new Set((employeeAppAssignments || []).map((a) => a.employee_id));
  const activeRiders = empDetails.filter((e) => driverIdSet.has(e.id)).length;

  const ordersByApp = rpc.ordersByApp || [];
  const totalOrders = ordersByApp.reduce((s, r) => s + (r.orders || 0), 0);
  const totalMonthTarget = ordersByApp.reduce((s, r) => s + (r.target || 0), 0);
  const targetAchievementPct = totalMonthTarget > 0 ? Math.min(999, Math.round((totalOrders / totalMonthTarget) * 100)) : 0;
  const estRevenueByApp = ordersByApp;
  const estRevenueTotal = rpc.kpis?.estRevenueTotal || estRevenueByApp.reduce((s, r) => s + (r.estRevenue || 0), 0);

  const ordersByCity = (rpc.ordersByCity || []).map((r) => ({
    city: mapOrdersCityLabel(r.city),
    orders: r.orders,
  }));

  const allRiders = (rpc.riders || []).map((r) => ({
    name: r.name,
    orders: r.orders,
    app: r.app,
    appColor: r.appColor,
    appId: r.appId,
  }));

  const kpis = {
    activeEmployees: empDetails.length,
    activeRiders,
    totalMonthTarget,
    targetAchievementPct,
    presentToday, absentToday, lateToday, leaveToday, sickToday,
    totalOrders, prevMonthOrders: rpc.kpis?.prevMonthOrders || 0,
    activeVehicles: rpc.kpis?.activeVehicles || 0,
    activeAlerts: rpc.kpis?.activeAlerts || 0,
    activeApps: rpc.kpis?.activeApps || apps.length,
    hasLicense: empDetails.filter(e => e.license_status === 'has_license').length,
    appliedLicense: empDetails.filter(e => e.license_status === 'applied').length,
    noLicense: empDetails.filter(e => !e.license_status || e.license_status === 'no_license').length,
    makkahCount: empDetails.filter((e) => getCityKey(e.city) === 'makkah').length,
    jeddahCount: empDetails.filter((e) => getCityKey(e.city) === 'jeddah').length,
    estRevenueTotal,
    ...additionalMetrics,
  };

  const attendanceWeek = buildAttendanceWeek(
    rpc.attendanceWeek || []
  );

  return { kpis, empDetails, ordersByApp, ordersByCity, allRiders, attendanceWeek, apps, estRevenueByApp, supervisorPerformance, operationalStats };
};

function DashboardAnalyticsFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <BarChart2 size={40} className="mx-auto text-primary animate-pulse" />
        <p className="text-muted-foreground text-sm">جارٍ تحميل التحليلات...</p>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { selectedMonth: currentMonth } = useTemporalContext();
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('overview');

  const {
    loading,
    isError,
    error,
    refetch,
    isFetching,
    kpis,
    orderGrowth,
    ordersByApp,
    ordersByCity,
    attendanceWeek,
    topNInput,
    setTopNInput,
    handleTopNBlur,
    topRidersOverall,
    topRidersPerApp,
    bottomRidersPerApp,
    atRiskRiders,
    supervisorPerformance,
  } = useDashboard({
    userId: uid,
    currentMonth,
    enabled,
    authUserId: user?.id,
    fetchDashboardKpis,
    parsePositiveIntOrNull,
    useRealtimeInvalidation: useDashboardRealtimeInvalidation,
  });

  const handleTabChange = (tab: DashboardTabKey) => {
    if (tab === 'analytics') {
      void loadDashboardAnalyticsTab();
    }

    startTransition(() => {
      setActiveTab(tab);
    });
  };


  return (
    <div className="space-y-5">
      <DashboardHeaderSection
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAnalyticsIntent={() => {
          void loadDashboardAnalyticsTab();
        }}
      />

      {activeTab === 'analytics' ? (
        <Suspense fallback={<DashboardAnalyticsFallback />}>
          <LazyDashboardAnalyticsTab />
        </Suspense>
      ) : null}
      {activeTab === 'overview' && isError && (
        <QueryErrorRetry
          error={error}
          onRetry={() => void refetch()}
          isFetching={isFetching}
          title="تعذر تحميل لوحة المعلومات"
          hint="جرّب الشهر الحالي أولاً. تحقق من الاتصال وصلاحياتك؛ إن لزم انتظر قليلاً ثم أعد المحاولة."
        />
      )}
      {activeTab === 'overview' && !isError && (
        <DashboardOverviewTab
          loading={loading}
          kpis={kpis}
          orderGrowth={orderGrowth}
          ordersByApp={ordersByApp}
          ordersByCity={ordersByCity}
          topNInput={topNInput}
          setTopNInput={setTopNInput}
          handleTopNBlur={handleTopNBlur}
          topRidersOverall={topRidersOverall}
          topRidersPerApp={topRidersPerApp}
          bottomRidersPerApp={bottomRidersPerApp}
          atRiskRiders={atRiskRiders}
          attendanceWeek={attendanceWeek}
          supervisorPerformance={supervisorPerformance}
        />
      )}
    </div>
  );
};

export default Dashboard;
