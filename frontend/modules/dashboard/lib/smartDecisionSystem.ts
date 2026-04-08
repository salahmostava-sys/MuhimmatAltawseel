import type { DashboardEmployeePerformanceRow } from '@services/performanceService';
import type { DashboardWorkTypeFilter } from '@shared/lib/employeeWorkType';
import type { SystemAdvancedConfig } from '@shared/lib/systemAdvancedConfig';

export type DashboardPerformanceBand = 'all' | 'top' | 'average' | 'low';
export type InsightTone = 'success' | 'warning' | 'info';

export interface DashboardPlatformOption {
  id: string;
  name: string;
  orders: number;
}

export interface DashboardSmartInsight {
  id: string;
  tone: InsightTone;
  title: string;
  summary: string;
  action: string;
}

export interface DashboardGamificationAward {
  id: string;
  title: string;
  employeeId: string | null;
  employeeName: string;
  metric: string;
  note: string;
}

export interface DashboardBestWeekday {
  key: string;
  label: string;
  totalOrders: number;
}

export interface DashboardDecisionSnapshot {
  filteredRows: DashboardEmployeePerformanceRow[];
  platformOptions: DashboardPlatformOption[];
  distribution: {
    top: number;
    average: number;
    low: number;
  };
  targetSummary: {
    achieved: number;
    target: number;
    pct: number;
  };
  improvementRate: number;
  bestWeekday: DashboardBestWeekday | null;
  smartInsights: DashboardSmartInsight[];
  awards: DashboardGamificationAward[];
}

type DashboardDecisionInput = {
  rows: DashboardEmployeePerformanceRow[];
  previousRows: DashboardEmployeePerformanceRow[];
  config: SystemAdvancedConfig;
  filterType: DashboardWorkTypeFilter;
  platformId: string;
  performanceBand: DashboardPerformanceBand;
};

const WEEKDAY_LABELS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getTopThreshold(config: SystemAdvancedConfig): number {
  return Math.max(config.alerts.lowPerformanceThreshold + 20, 85);
}

export function getEffectiveMonthlyTarget(
  row: DashboardEmployeePerformanceRow,
  config: SystemAdvancedConfig,
): number {
  if (row.monthlyTargetOrders > 0) return row.monthlyTargetOrders;
  if (config.targets.mode === 'global') return config.targets.monthlyOrders;
  return 0;
}

export function getEffectiveDailyTarget(
  row: DashboardEmployeePerformanceRow,
  config: SystemAdvancedConfig,
): number {
  if (row.dailyTargetOrders > 0) return row.dailyTargetOrders;
  if (config.targets.mode === 'global') return config.targets.dailyOrders;
  return 0;
}

function getWeeklyOrders(row: DashboardEmployeePerformanceRow): number {
  return row.recentDailyOrders.reduce((sum, item) => sum + item.orders, 0);
}

function getMetricForRanking(row: DashboardEmployeePerformanceRow, config: SystemAdvancedConfig): number {
  switch (config.ranking.scoringMode) {
    case 'orders':
      return row.totalOrders;
    case 'attendance':
      return row.attendanceRate;
    case 'hybrid':
    default:
      return row.performanceScore;
  }
}

function getConsistencyValue(row: DashboardEmployeePerformanceRow): number {
  if (row.workType === 'attendance') {
    return row.attendanceRate - row.daysAbsent * 8;
  }

  if (row.workType === 'hybrid') {
    return row.attendanceRate + row.targetAchievementPct * 0.35 - row.daysAbsent * 5;
  }

  return row.avgOrdersPerDay * 4 + row.targetAchievementPct * 0.25;
}

export function getDashboardPerformanceBand(
  row: DashboardEmployeePerformanceRow,
  config: SystemAdvancedConfig,
): Exclude<DashboardPerformanceBand, 'all'> {
  if (row.performanceScore < config.alerts.lowPerformanceThreshold) {
    return 'low';
  }

  if (row.performanceScore >= getTopThreshold(config)) {
    return 'top';
  }

  return 'average';
}

export function filterDashboardRows(
  rows: DashboardEmployeePerformanceRow[],
  params: {
    config: SystemAdvancedConfig;
    filterType: DashboardWorkTypeFilter;
    platformId: string;
    performanceBand: DashboardPerformanceBand;
  },
): DashboardEmployeePerformanceRow[] {
  const { config, filterType, platformId, performanceBand } = params;

  return rows.filter((row) => {
    if (filterType !== 'all' && row.workType !== filterType) {
      return false;
    }

    if (
      platformId !== 'all' &&
      !row.ordersByApp.some((app) => app.appId === platformId)
    ) {
      return false;
    }

    if (performanceBand !== 'all' && getDashboardPerformanceBand(row, config) !== performanceBand) {
      return false;
    }

    return true;
  });
}

function buildPlatformOptions(
  rows: DashboardEmployeePerformanceRow[],
  filterType: DashboardWorkTypeFilter,
  config: SystemAdvancedConfig,
): DashboardPlatformOption[] {
  const scopedRows = filterDashboardRows(rows, {
    config,
    filterType,
    platformId: 'all',
    performanceBand: 'all',
  });
  const platformMap = new Map<string, DashboardPlatformOption>();

  for (const row of scopedRows) {
    for (const app of row.ordersByApp) {
      const current = platformMap.get(app.appId) ?? {
        id: app.appId,
        name: app.appName,
        orders: 0,
      };
      current.orders += app.ordersCount;
      platformMap.set(app.appId, current);
    }
  }

  return Array.from(platformMap.values()).sort((left, right) => right.orders - left.orders);
}

function buildDistribution(
  rows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
): DashboardDecisionSnapshot['distribution'] {
  return rows.reduce(
    (acc, row) => {
      const band = getDashboardPerformanceBand(row, config);
      acc[band] += 1;
      return acc;
    },
    { top: 0, average: 0, low: 0 },
  );
}

function buildTargetSummaryWithConfig(
  rows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
) {
  const achieved = rows.reduce((sum, row) => sum + row.totalOrders, 0);
  const target = rows.reduce((sum, row) => sum + getEffectiveMonthlyTarget(row, config), 0);
  return {
    achieved,
    target,
    pct: target > 0 ? round((achieved / target) * 100, 1) : 0,
  };
}

function buildImprovementRate(
  rows: DashboardEmployeePerformanceRow[],
  previousRows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
): number {
  if (rows.length === 0 || previousRows.length === 0) return 0;

  const previousMap = new Map(previousRows.map((row) => [row.employeeId, row]));
  const comparisons = rows
    .map((row) => {
      const previous = previousMap.get(row.employeeId);
      if (!previous) return null;
      return getMetricForRanking(row, config) - getMetricForRanking(previous, config);
    })
    .filter((value): value is number => value != null);

  if (comparisons.length === 0) return 0;

  return round(comparisons.reduce((sum, value) => sum + value, 0) / comparisons.length, 1);
}

function buildBestWeekday(rows: DashboardEmployeePerformanceRow[]): DashboardBestWeekday | null {
  const weekdayTotals = new Map<number, number>();

  for (const row of rows) {
    for (const point of row.recentDailyOrders) {
      const date = new Date(`${point.date}T12:00:00`);
      const weekday = date.getDay();
      weekdayTotals.set(weekday, (weekdayTotals.get(weekday) ?? 0) + point.orders);
    }
  }

  const winner = Array.from(weekdayTotals.entries()).sort((left, right) => right[1] - left[1])[0];
  if (!winner) return null;

  return {
    key: String(winner[0]),
    label: WEEKDAY_LABELS_AR[winner[0]] ?? 'غير معروف',
    totalOrders: winner[1],
  };
}

function buildSmartInsights(
  rows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
): DashboardSmartInsight[] {
  if (rows.length === 0) return [];

  const lowPerformers = rows
    .filter((row) => getDashboardPerformanceBand(row, config) === 'low')
    .sort((left, right) => left.performanceScore - right.performanceScore);
  const topPerformers = rows
    .filter((row) => getDashboardPerformanceBand(row, config) === 'top')
    .sort((left, right) => right.performanceScore - left.performanceScore);
  const absenceRisk = rows
    .filter((row) => row.daysAbsent >= config.alerts.absenceDaysThreshold)
    .sort((left, right) => right.daysAbsent - left.daysAbsent);
  const belowTarget = rows
    .map((row) => {
      const effectiveTarget = getEffectiveMonthlyTarget(row, config);
      const achievementPct =
        effectiveTarget > 0 ? round((row.totalOrders / effectiveTarget) * 100, 1) : row.targetAchievementPct;
      return {
        row,
        effectiveTarget,
        achievementPct,
      };
    })
    .filter((entry) => entry.effectiveTarget > 0 && entry.achievementPct < 75)
    .sort((left, right) => left.achievementPct - right.achievementPct);

  const insights: DashboardSmartInsight[] = [];

  if (lowPerformers.length > 0) {
    insights.push({
      id: 'low-performers',
      tone: 'warning',
      title: `عندك ${lowPerformers.length} مندوب تحت الحد الأدنى`,
      summary: `أضعف نتيجة الآن ${lowPerformers[0].employeeName} بدرجة ${lowPerformers[0].performanceScore}/100.`,
      action:
        'يفضل تخفيف الحمل مؤقتًا، مراجعة المنصة أو الشيفت، ثم متابعة التحسن خلال أسبوع.',
    });
  }

  if (topPerformers.length > 0) {
    insights.push({
      id: 'top-performer',
      tone: 'success',
      title: `${topPerformers[0].employeeName} يقود الأداء الحالي`,
      summary: `حقق ${topPerformers[0].totalOrders} طلب ودرجة ${topPerformers[0].performanceScore}/100.`,
      action:
        'يفضل منحه أولوية في الشفتات أو المكافآت ليحافظ على الزخم وينقل الخبرة للباقين.',
    });
  }

  if (absenceRisk.length > 0) {
    insights.push({
      id: 'absence-risk',
      tone: 'warning',
      title: `مخاطر انضباط لدى ${absenceRisk.length} موظف`,
      summary: `${absenceRisk[0].employeeName} لديه ${absenceRisk[0].daysAbsent} أيام غياب في الفترة الحالية.`,
      action:
        'راجع الجدول والالتزام اليومي بسرعة قبل أن يتحول الغياب إلى أثر مباشر على الراتب والخدمة.',
    });
  }

  if (belowTarget.length > 0) {
    const totalGap = belowTarget.reduce(
      (sum, entry) => sum + Math.max(entry.effectiveTarget - entry.row.totalOrders, 0),
      0,
    );
    insights.push({
      id: 'target-gap',
      tone: 'info',
      title: `فجوة الهدف ما زالت ${totalGap.toLocaleString('ar-SA')} طلب`,
      summary: `${belowTarget.length} موظف ما زالوا أقل من 75% من الهدف الشهري.`,
      action:
        'حوّل الحمل للمنصات الأعلى طلبًا وراجع التوزيع اليومي بدل الاعتماد على نفس الشيفتات للجميع.',
    });
  }

  return insights.slice(0, 4);
}

function buildAwards(
  rows: DashboardEmployeePerformanceRow[],
  previousRows: DashboardEmployeePerformanceRow[],
  config: SystemAdvancedConfig,
): DashboardGamificationAward[] {
  const emptyAward = (id: string, title: string): DashboardGamificationAward => ({
    id,
    title,
    employeeId: null,
    employeeName: 'لا يوجد',
    metric: '—',
    note: 'لا توجد بيانات كافية الآن.',
  });

  if (rows.length === 0) {
    return [
      emptyAward('top-week', 'Top Rider of Week'),
      emptyAward('most-improved', 'Most Improved'),
      emptyAward('best-consistency', 'Best Consistency'),
    ];
  }

  const previousMap = new Map(previousRows.map((row) => [row.employeeId, row]));
  const topWeek = [...rows].sort((left, right) => getWeeklyOrders(right) - getWeeklyOrders(left))[0];
  const mostImproved = [...rows]
    .map((row) => {
      const previous = previousMap.get(row.employeeId);
      const delta = previous ? getMetricForRanking(row, config) - getMetricForRanking(previous, config) : 0;
      return { row, delta };
    })
    .sort((left, right) => right.delta - left.delta)[0];
  const mostConsistent = [...rows]
    .map((row) => ({ row, value: getConsistencyValue(row) }))
    .sort((left, right) => right.value - left.value)[0];

  return [
    topWeek
      ? {
          id: 'top-week',
          title: 'Top Rider of Week',
          employeeId: topWeek.employeeId,
          employeeName: topWeek.employeeName,
          metric: `${getWeeklyOrders(topWeek).toLocaleString('ar-SA')} طلب`,
          note: 'الأعلى إنتاجًا خلال آخر 7 أيام داخل التصفية الحالية.',
        }
      : emptyAward('top-week', 'Top Rider of Week'),
    mostImproved
      ? {
          id: 'most-improved',
          title: 'Most Improved',
          employeeId: mostImproved.row.employeeId,
          employeeName: mostImproved.row.employeeName,
          metric: `+${round(mostImproved.delta).toLocaleString('ar-SA')}`,
          note: 'أفضل تحسن مقارنة بالشهر السابق حسب أسلوب التقييم الحالي.',
        }
      : emptyAward('most-improved', 'Most Improved'),
    mostConsistent
      ? {
          id: 'best-consistency',
          title: 'Best Consistency',
          employeeId: mostConsistent.row.employeeId,
          employeeName: mostConsistent.row.employeeName,
          metric: `${round(mostConsistent.value).toLocaleString('ar-SA')}`,
          note: 'الأكثر ثباتًا بين الحضور وتحقيق الهدف والنشاط التشغيلي.',
        }
      : emptyAward('best-consistency', 'Best Consistency'),
  ];
}

export function buildDashboardDecisionSnapshot(
  input: DashboardDecisionInput,
): DashboardDecisionSnapshot {
  const {
    rows,
    previousRows,
    config,
    filterType,
    platformId,
    performanceBand,
  } = input;

  const platformOptions = buildPlatformOptions(rows, filterType, config);
  const filteredRows = filterDashboardRows(rows, {
    config,
    filterType,
    platformId,
    performanceBand,
  });
  const filteredPreviousRows = filterDashboardRows(previousRows, {
    config,
    filterType,
    platformId,
    performanceBand: 'all',
  });

  return {
    filteredRows,
    platformOptions,
    distribution: buildDistribution(filteredRows, config),
    targetSummary: buildTargetSummaryWithConfig(filteredRows, config),
    improvementRate: buildImprovementRate(filteredRows, filteredPreviousRows, config),
    bestWeekday: buildBestWeekday(filteredRows),
    smartInsights: buildSmartInsights(filteredRows, config),
    awards: buildAwards(filteredRows, filteredPreviousRows, config),
  };
}

export function buildDecisionSystemPrompt(params: {
  rows: DashboardEmployeePerformanceRow[];
  snapshot: DashboardDecisionSnapshot;
  monthYear: string;
  filterType: DashboardWorkTypeFilter;
  platformId: string;
  performanceBand: DashboardPerformanceBand;
  config: SystemAdvancedConfig;
}): string {
  const { rows, snapshot, monthYear, filterType, platformId, performanceBand, config } = params;
  if (rows.length === 0) return '';

  const awards = snapshot.awards
    .map((award) => `- ${award.title}: ${award.employeeName} (${award.metric})`)
    .join('\n');
  const insights = snapshot.smartInsights
    .map((insight) => `- ${insight.title}: ${insight.summary} | الإجراء: ${insight.action}`)
    .join('\n');

  return [
    'أنت مساعد قرار تشغيلي. أجب بالعربية وبأسلوب مباشر وقابل للتنفيذ.',
    `الشهر الحالي: ${monthYear}.`,
    `نوع التصفية: ${filterType}.`,
    `المنصة: ${platformId}.`,
    `مستوى الأداء: ${performanceBand}.`,
    `نمط التقييم الأساسي: ${config.ranking.scoringMode}.`,
    `الحد الأدنى للأداء: ${config.alerts.lowPerformanceThreshold}/100.`,
    `عدد الموظفين في التصفية: ${rows.length}.`,
    `تحقيق الهدف: ${snapshot.targetSummary.achieved} / ${snapshot.targetSummary.target} (${snapshot.targetSummary.pct.toFixed(1)}%).`,
    `معدل التحسن عن الشهر السابق: ${snapshot.improvementRate.toFixed(1)} نقطة.`,
    snapshot.bestWeekday
      ? `أفضل يوم أسبوعي: ${snapshot.bestWeekday.label} (${snapshot.bestWeekday.totalOrders} طلب).`
      : 'لا يوجد أفضل يوم أسبوعي واضح.',
    'قرارات موصى بها:',
    insights || '- لا توجد قرارات إضافية حالياً.',
    'جوائز وتحفيز:',
    awards,
    'إذا سُئلت عن أسوأ 5 أو أفضل 5 فاعتمد فقط على السجلات الحالية ولا تخترع أسماء أو أرقام.',
  ].join('\n');
}
