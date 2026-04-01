import type { DashboardExportKpis } from '@modules/dashboard/types/dashboardExportKpis';

/** ملخص قواعد عربي من مؤشرات اللوحة — بدون نموذج لغوي؛ للقراءة السريعة فقط. */
export function buildDashboardAiSummaryLines(
  kpis: DashboardExportKpis,
  orderGrowth: number,
): string[] {
  const lines: string[] = [];

  if (kpis.prevMonthOrders > 0) {
    if (orderGrowth >= 15) {
      lines.push(`نمو ملحوظ في طلبات الشهر مقارنة بالشهر السابق (حوالي ${orderGrowth.toFixed(1)}٪).`);
    } else if (orderGrowth <= -15) {
      lines.push(`تراجع في طلبات الشهر مقارنة بالشهر السابق (حوالي ${Math.abs(orderGrowth).toFixed(1)}٪) — راجع الطلبات والمنصات.`);
    } else {
      lines.push(`تغيّر طلبات الشهر مقارنة بالسابق ضمن نطاق معتدل (${orderGrowth >= 0 ? '+' : ''}${orderGrowth.toFixed(1)}٪).`);
    }
  } else if (kpis.totalOrders > 0) {
    lines.push('لا يتوفر طلبات للشهر السابق للمقارنة؛ ركّز على متابعة طلبات الشهر الحالي.');
  }

  if (kpis.totalMonthTarget > 0 && kpis.targetAchievementPct < 50) {
    lines.push(`التقدم نحو هدف المنصات للشهر لا يزال دون 50٪ (حوالي ${kpis.targetAchievementPct}٪).`);
  } else if (kpis.totalMonthTarget > 0 && kpis.targetAchievementPct >= 90) {
    lines.push(`أداء جيد نحو هدف الشهر (حوالي ${kpis.targetAchievementPct}٪ من الهدف الإجمالي).`);
  }

  if (kpis.activeAlerts > 0) {
    lines.push(`يوجد ${kpis.activeAlerts.toLocaleString('ar-SA')} تنبيه/تنبيهات غير محلولة — يُنصح بمراجعة صفحة التنبيهات.`);
  }

  if (kpis.absentToday > 0 || kpis.lateToday > 0) {
    const parts: string[] = [];
    if (kpis.absentToday > 0) parts.push(`${kpis.absentToday.toLocaleString('ar-SA')} غائباً`);
    if (kpis.lateToday > 0) parts.push(`${kpis.lateToday.toLocaleString('ar-SA')} متأخراً`);
    lines.push(`اليوم: ${parts.join('، ')} — راجع الحضور.`);
  }

  if (kpis.activeRiders > 0 && kpis.totalOrders > 0) {
    const avg = Math.round(kpis.totalOrders / kpis.activeRiders);
    lines.push(`متوسط الطلبات لكل مندوب مرتبط بالمنصات هذا الشهر حوالي ${avg.toLocaleString('ar-SA')} طلباً.`);
  }

  if (lines.length === 0) {
    lines.push('لا توجد ملاحظات تشغيلية بارئة من المؤشرات الحالية؛ تابع المؤشرات يومياً.');
  }

  return lines.slice(0, 5);
}
