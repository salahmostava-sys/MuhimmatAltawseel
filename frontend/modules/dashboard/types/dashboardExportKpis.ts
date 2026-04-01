/** لقطة مؤشرات للتصدير والملخص القواعدي — تبقى متوافقة مع `useDashboard` kpis. */
export type DashboardExportKpis = {
  activeEmployees: number;
  activeRiders: number;
  totalMonthTarget: number;
  targetAchievementPct: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  leaveToday: number;
  sickToday: number;
  totalOrders: number;
  prevMonthOrders: number;
  activeVehicles: number;
  activeAlerts: number;
  activeApps: number;
  makkahCount: number;
  jeddahCount: number;
  estRevenueTotal: number;
};
