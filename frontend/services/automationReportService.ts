import { addMonths, format } from 'date-fns';
import { ar } from 'date-fns/locale';

import {
  buildDashboardDecisionSnapshot,
  getDashboardPerformanceBand,
  getEffectiveMonthlyTarget,
} from '@modules/dashboard/lib/smartDecisionSystem';
import { performanceService, type DashboardEmployeePerformanceRow } from '@services/performanceService';
import { telegramService } from '@services/telegramService';
import { getEmployeeWorkTypeLabel } from '@shared/lib/employeeWorkType';
import {
  DEFAULT_SYSTEM_ADVANCED_CONFIG,
  type SystemAdvancedConfig,
} from '@shared/lib/systemAdvancedConfig';

export type AutomationReportKind = 'daily' | 'weekly' | 'alerts' | 'test';

export interface AutomationSettingsInput {
  projectName?: string | null;
  advancedConfig?: SystemAdvancedConfig | null;
}

export interface AutomationReportDocument {
  kind: AutomationReportKind;
  title: string;
  message: string;
  monthYear: string;
  rowCount: number;
}

export interface AutomationSendResult extends AutomationReportDocument {
  targetChatId: string;
}

type AutomationAvailability = {
  enabled: boolean;
  reason?: string;
};

type BuildAutomationReportParams = {
  kind: Exclude<AutomationReportKind, 'test'>;
  monthYear: string;
  settings: AutomationSettingsInput;
  rows: DashboardEmployeePerformanceRow[];
  previousRows: DashboardEmployeePerformanceRow[];
};

const MONTH_YEAR_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function resolveAdvancedConfig(settings: AutomationSettingsInput): SystemAdvancedConfig {
  return settings.advancedConfig ?? DEFAULT_SYSTEM_ADVANCED_CONFIG;
}

function resolveProjectName(settings: AutomationSettingsInput): string {
  return settings.projectName?.trim() || 'مهمات التوصيل';
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatMonthLabel(monthYear: string): string {
  try {
    return format(new Date(`${monthYear}-01T12:00:00`), 'MMMM yyyy', { locale: ar });
  } catch {
    return monthYear;
  }
}

function formatCurrency(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString('ar-SA')} ${currency}`;
}

function formatRatio(current: number, target: number): string {
  if (target <= 0) return `${current.toLocaleString('ar-SA')}`;
  const pct = round((current / Math.max(target, 1)) * 100, 1);
  return `${current.toLocaleString('ar-SA')} / ${target.toLocaleString('ar-SA')} (${pct.toFixed(1)}%)`;
}

function truncateTelegramMessage(message: string, maxLength = 3800): string {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength - 20).trimEnd()}\n\n... تم اختصار الرسالة.`;
}

function assertValidMonthYear(monthYear: string) {
  if (!MONTH_YEAR_PATTERN.test(monthYear)) {
    throw new Error('صيغة الشهر غير صحيحة. استخدم YYYY-MM.');
  }
}

function buildLatestDailyStats(rows: DashboardEmployeePerformanceRow[]) {
  const totalsByDate = new Map<string, number>();

  for (const row of rows) {
    for (const point of row.recentDailyOrders) {
      totalsByDate.set(point.date, (totalsByDate.get(point.date) ?? 0) + point.orders);
    }
  }

  const entries = Array.from(totalsByDate.entries()).sort((left, right) => right[0].localeCompare(left[0]));
  const latest = entries[0] ?? null;

  return {
    latestDate: latest?.[0] ?? null,
    latestOrders: latest?.[1] ?? 0,
    lastSevenDaysOrders: entries.reduce((sum, entry) => sum + entry[1], 0),
  };
}

function buildPerformanceLine(
  row: DashboardEmployeePerformanceRow,
  config: SystemAdvancedConfig,
  index: number,
): string {
  const target = getEffectiveMonthlyTarget(row, config);
  const achievementLabel =
    target > 0
      ? `هدف ${round((row.totalOrders / Math.max(target, 1)) * 100, 0).toLocaleString('ar-SA')}%`
      : `التزام ${row.attendanceRate.toFixed(0)}%`;

  return `${index + 1}. ${row.employeeName} | ${getEmployeeWorkTypeLabel(row.workType)} | ${row.totalOrders.toLocaleString('ar-SA')} طلب | ${row.performanceScore}/100 | ${achievementLabel}`;
}

function buildRiskLine(
  row: DashboardEmployeePerformanceRow,
  config: SystemAdvancedConfig,
  index: number,
): string {
  const band = getDashboardPerformanceBand(row, config);
  return `${index + 1}. ${row.employeeName} | ${band.toUpperCase()} | درجة ${row.performanceScore}/100 | غياب ${row.daysAbsent} | طلبات ${row.totalOrders.toLocaleString('ar-SA')}`;
}

function getTopRows(
  rows: DashboardEmployeePerformanceRow[],
  count: number,
): DashboardEmployeePerformanceRow[] {
  return [...rows]
    .sort(
      (left, right) =>
        right.performanceScore - left.performanceScore ||
        right.totalOrders - left.totalOrders ||
        right.daysPresent - left.daysPresent,
    )
    .slice(0, count);
}

function getLowRows(
  rows: DashboardEmployeePerformanceRow[],
  count: number,
): DashboardEmployeePerformanceRow[] {
  return [...rows]
    .sort(
      (left, right) =>
        left.performanceScore - right.performanceScore ||
        right.daysAbsent - left.daysAbsent ||
        left.totalOrders - right.totalOrders,
    )
    .slice(0, count);
}

function getAlertsFocusRows(
  rows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
): DashboardEmployeePerformanceRow[] {
  return [...rows]
    .filter(
      (row) =>
        row.performanceScore < config.alerts.lowPerformanceThreshold ||
        row.daysAbsent >= config.alerts.absenceDaysThreshold,
    )
    .sort(
      (left, right) =>
        left.performanceScore - right.performanceScore ||
        right.daysAbsent - left.daysAbsent,
    );
}

export function getAutomationAvailability(
  kind: AutomationReportKind,
  config: SystemAdvancedConfig,
): AutomationAvailability {
  if (!telegramService.isConfigured({
    botToken: config.telegram.botToken,
    adminChatId: config.telegram.adminChatId,
  })) {
    return {
      enabled: false,
      reason: 'أدخل Bot Token و Admin Chat ID أولاً.',
    };
  }

  if (kind === 'daily') {
    if (!config.automation.dailyReports) {
      return { enabled: false, reason: 'فعّل Daily Reports من إعدادات الأتمتة أولاً.' };
    }
    if (!config.telegram.dailyReportEnabled) {
      return { enabled: false, reason: 'فعّل إرسال التقرير اليومي من إعدادات تيليجرام أولاً.' };
    }
  }

  if (kind === 'weekly' && !config.automation.weeklyReports) {
    return { enabled: false, reason: 'فعّل Weekly Reports من إعدادات الأتمتة أولاً.' };
  }

  if (kind === 'alerts') {
    if (!config.automation.alerts) {
      return { enabled: false, reason: 'فعّل Alerts من إعدادات الأتمتة أولاً.' };
    }
    if (!config.telegram.alertsEnabled) {
      return { enabled: false, reason: 'فعّل Alerts من إعدادات تيليجرام أولاً.' };
    }
  }

  return { enabled: true };
}

export function buildAutomationReportDocument(
  params: BuildAutomationReportParams,
): AutomationReportDocument {
  const { kind, monthYear, settings, rows, previousRows } = params;
  const config = resolveAdvancedConfig(settings);
  const projectName = resolveProjectName(settings);
  const currency = config.general.currency || 'SAR';
  const snapshot = buildDashboardDecisionSnapshot({
    rows,
    previousRows,
    config,
    filterType: 'all',
    platformId: 'all',
    performanceBand: 'all',
  });

  const visibleRows = snapshot.filteredRows;
  const topRows = getTopRows(visibleRows, Math.max(config.ranking.topPerformersCount, 3));
  const lowRows = getLowRows(visibleRows, Math.max(config.ranking.worstPerformersCount, 3));
  const alertsRows = getAlertsFocusRows(visibleRows, config).slice(0, Math.max(config.ranking.worstPerformersCount, 5));
  const payroll = visibleRows.reduce((sum, row) => sum + row.salary, 0);
  const recentStats = buildLatestDailyStats(visibleRows);
  const awardsLines = snapshot.awards.map((award) => `- ${award.title}: ${award.employeeName} (${award.metric})`);
  const insightsLines = snapshot.smartInsights.map((insight) => `- ${insight.title}: ${insight.action}`);
  const topSection =
    topRows.length > 0
      ? topRows.slice(0, 5).map((row, index) => buildPerformanceLine(row, config, index))
      : ['- لا توجد بيانات أداء كافية لهذا الشهر.'];
  const lowSection =
    lowRows.length > 0
      ? lowRows.slice(0, 3).map((row, index) => buildRiskLine(row, config, index))
      : ['- لا توجد حالات متابعة حرجة الآن.'];

  const sharedHeader = [
    `المشروع: ${projectName}`,
    `الشهر: ${formatMonthLabel(monthYear)}`,
    `عدد الموظفين: ${visibleRows.length.toLocaleString('ar-SA')}`,
  ];

  if (kind === 'daily') {
    const message = [
      '📊 التقرير اليومي التشغيلي',
      ...sharedHeader,
      recentStats.latestDate
        ? `آخر يوم مسجل: ${recentStats.latestDate} | ${recentStats.latestOrders.toLocaleString('ar-SA')} طلب`
        : 'آخر يوم مسجل: لا توجد بيانات يومية كافية',
      `إجمالي الطلبات الشهرية: ${snapshot.targetSummary.achieved.toLocaleString('ar-SA')}`,
      `تحقيق الهدف: ${formatRatio(snapshot.targetSummary.achieved, snapshot.targetSummary.target)}`,
      `إجمالي الرواتب التقديرية: ${formatCurrency(payroll, currency)}`,
      '',
      'أفضل العناصر الآن:',
      ...topSection.slice(0, 3),
      '',
      'متابعة عاجلة:',
      ...lowSection,
      '',
      'قرارات مقترحة:',
      ...(insightsLines.length > 0 ? insightsLines.slice(0, 3) : ['- لا توجد قرارات عاجلة الآن.']),
      '',
      snapshot.awards[0]
        ? `🏆 ${snapshot.awards[0].title}: ${snapshot.awards[0].employeeName} (${snapshot.awards[0].metric})`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      kind,
      title: 'التقرير اليومي التشغيلي',
      message: truncateTelegramMessage(message),
      monthYear,
      rowCount: visibleRows.length,
    };
  }

  if (kind === 'weekly') {
    const message = [
      '📈 التقرير الأسبوعي',
      ...sharedHeader,
      `إجمالي آخر 7 أيام: ${recentStats.lastSevenDaysOrders.toLocaleString('ar-SA')} طلب`,
      `معدل التحسن عن الشهر السابق: ${snapshot.improvementRate >= 0 ? '+' : ''}${snapshot.improvementRate.toFixed(1)} نقطة`,
      snapshot.bestWeekday
        ? `أفضل يوم أسبوعي: ${snapshot.bestWeekday.label} (${snapshot.bestWeekday.totalOrders.toLocaleString('ar-SA')} طلب)`
        : 'أفضل يوم أسبوعي: لا توجد بيانات كافية',
      `توزيع الأداء: Top ${snapshot.distribution.top} | Average ${snapshot.distribution.average} | Low ${snapshot.distribution.low}`,
      '',
      'الجوائز:',
      ...(awardsLines.length > 0 ? awardsLines : ['- لا توجد جوائز كافية الآن.']),
      '',
      'أفضل العناصر:',
      ...topSection,
      '',
      'أهم قرارات الأسبوع:',
      ...(insightsLines.length > 0 ? insightsLines.slice(0, 4) : ['- لا توجد قرارات إضافية هذا الأسبوع.']),
    ].join('\n');

    return {
      kind,
      title: 'التقرير الأسبوعي',
      message: truncateTelegramMessage(message),
      monthYear,
      rowCount: visibleRows.length,
    };
  }

  const message = [
    '🚨 ملخص التنبيهات',
    ...sharedHeader,
    `الحالات منخفضة الأداء: ${visibleRows.filter((row) => row.performanceScore < config.alerts.lowPerformanceThreshold).length}`,
    `مخاطر الغياب: ${visibleRows.filter((row) => row.daysAbsent >= config.alerts.absenceDaysThreshold).length}`,
    `فجوة الهدف الحالية: ${Math.max(snapshot.targetSummary.target - snapshot.targetSummary.achieved, 0).toLocaleString('ar-SA')} طلب`,
    '',
    'الحالات التي تحتاج تدخل:',
    ...(alertsRows.length > 0
      ? alertsRows.map((row, index) => buildRiskLine(row, config, index))
      : ['- لا توجد تنبيهات حرجة حاليًا.']),
    '',
    'الإجراءات الموصى بها:',
    ...(insightsLines.length > 0 ? insightsLines.slice(0, 4) : ['- راقب المؤشرات خلال الأيام القادمة فقط.']),
  ].join('\n');

  return {
    kind,
    title: 'ملخص التنبيهات',
    message: truncateTelegramMessage(message),
    monthYear,
    rowCount: visibleRows.length,
  };
}

export function buildTelegramTestDocument(
  settings: AutomationSettingsInput,
  monthYear = format(new Date(), 'yyyy-MM'),
): AutomationReportDocument {
  const projectName = resolveProjectName(settings);

  return {
    kind: 'test',
    title: 'رسالة اختبار تيليجرام',
    monthYear,
    rowCount: 0,
    message: [
      '🤖 رسالة اختبار تيليجرام',
      `المشروع: ${projectName}`,
      `الوقت: ${format(new Date(), 'PPpp', { locale: ar })}`,
      'إذا وصلت هذه الرسالة فالاتصال عبر Supabase Edge Function يعمل بنجاح.',
    ].join('\n'),
  };
}

async function loadReportRows(monthYear: string) {
  const previousMonth = format(addMonths(new Date(`${monthYear}-01T12:00:00`), -1), 'yyyy-MM');
  const [rows, previousRows] = await Promise.all([
    performanceService.getDashboardData('all', monthYear),
    performanceService.getDashboardData('all', previousMonth),
  ]);

  return { rows, previousRows };
}

export const automationReportService = {
  getAvailability: (kind: AutomationReportKind, settings: AutomationSettingsInput): AutomationAvailability =>
    getAutomationAvailability(kind, resolveAdvancedConfig(settings)),

  buildDocument: buildAutomationReportDocument,

  buildTestDocument: buildTelegramTestDocument,

  sendTestMessage: async (settings: AutomationSettingsInput): Promise<AutomationSendResult> => {
    const config = resolveAdvancedConfig(settings);
    const availability = getAutomationAvailability('test', config);
    if (!availability.enabled) {
      throw new Error(availability.reason);
    }

    const document = buildTelegramTestDocument(settings);
    await telegramService.sendMessage({
      botToken: config.telegram.botToken,
      chatId: config.telegram.adminChatId,
      text: document.message,
    });

    return {
      ...document,
      targetChatId: config.telegram.adminChatId,
    };
  },

  sendReport: async (
    kind: Exclude<AutomationReportKind, 'test'>,
    monthYear: string,
    settings: AutomationSettingsInput,
  ): Promise<AutomationSendResult> => {
    assertValidMonthYear(monthYear);
    const config = resolveAdvancedConfig(settings);
    const availability = getAutomationAvailability(kind, config);
    if (!availability.enabled) {
      throw new Error(availability.reason);
    }

    const { rows, previousRows } = await loadReportRows(monthYear);
    const document = buildAutomationReportDocument({
      kind,
      monthYear,
      settings,
      rows,
      previousRows,
    });

    await telegramService.sendMessage({
      botToken: config.telegram.botToken,
      chatId: config.telegram.adminChatId,
      text: document.message,
    });

    return {
      ...document,
      targetChatId: config.telegram.adminChatId,
    };
  },
};
