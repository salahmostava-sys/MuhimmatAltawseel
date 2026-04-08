import type { Json } from '@services/supabase/types';

export type SystemPreset = 'orders' | 'attendance' | 'hybrid';
export type WeekStartsOn = 'saturday' | 'sunday' | 'monday';
export type AnalysisLevel = 'simple' | 'advanced';
export type MessageLength = 'short' | 'medium' | 'long';
export type RankingMode = 'orders' | 'attendance' | 'hybrid';

export interface SystemAdvancedConfig {
  general: {
    currency: string;
    timezone: string;
    weekStartsOn: WeekStartsOn;
  };
  salary: {
    ordersRate: number;
    attendanceFixedSalary: number;
    hybridBaseSalary: number;
    hybridOrderRate: number;
    defaultBonus: number;
    defaultDeductions: number;
  };
  targets: {
    mode: 'global' | 'per_rider';
    dailyOrders: number;
    monthlyOrders: number;
  };
  ai: {
    enabled: boolean;
    analysisLevel: AnalysisLevel;
    messageLength: MessageLength;
    chatEnabled: boolean;
  };
  telegram: {
    botToken: string;
    adminChatId: string;
    dailyReportEnabled: boolean;
    alertsEnabled: boolean;
    riderMessagesEnabled: boolean;
  };
  alerts: {
    lowPerformanceThreshold: number;
    absenceDaysThreshold: number;
    minimumOrdersPerDay: number;
  };
  ranking: {
    scoringMode: RankingMode;
    topPerformersCount: number;
    worstPerformersCount: number;
  };
  dashboard: {
    showAIInsights: boolean;
    showCharts: boolean;
    showRanking: boolean;
    showSmartDecisions: boolean;
  };
  automation: {
    dailyReports: boolean;
    weeklyReports: boolean;
    alerts: boolean;
  };
  import: {
    strictValidation: boolean;
    previewBeforeSave: boolean;
  };
}

export interface SystemSettingsRecordLike {
  id?: string | null;
  project_name_ar?: string | null;
  project_name_en?: string | null;
  project_subtitle_ar?: string | null;
  project_subtitle_en?: string | null;
  logo_url?: string | null;
  default_language?: string | null;
  theme?: string | null;
  iqama_alert_days?: number | null;
  advanced_config?: unknown;
  updated_at?: string | null;
}

export interface NormalizedSystemSettings extends SystemSettingsRecordLike {
  id: string;
  project_name_ar: string;
  project_name_en: string;
  project_subtitle_ar: string;
  project_subtitle_en: string;
  logo_url: string | null;
  default_language: string;
  theme: string;
  iqama_alert_days: number;
  advanced_config: Json;
  advancedConfig: SystemAdvancedConfig;
  updated_at?: string | null;
}

export const DEFAULT_SYSTEM_ADVANCED_CONFIG: SystemAdvancedConfig = {
  general: {
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    weekStartsOn: 'sunday',
  },
  salary: {
    ordersRate: 7,
    attendanceFixedSalary: 3000,
    hybridBaseSalary: 2500,
    hybridOrderRate: 5,
    defaultBonus: 0,
    defaultDeductions: 0,
  },
  targets: {
    mode: 'per_rider',
    dailyOrders: 20,
    monthlyOrders: 600,
  },
  ai: {
    enabled: true,
    analysisLevel: 'advanced',
    messageLength: 'medium',
    chatEnabled: true,
  },
  telegram: {
    botToken: '',
    adminChatId: '',
    dailyReportEnabled: false,
    alertsEnabled: true,
    riderMessagesEnabled: false,
  },
  alerts: {
    lowPerformanceThreshold: 55,
    absenceDaysThreshold: 2,
    minimumOrdersPerDay: 8,
  },
  ranking: {
    scoringMode: 'hybrid',
    topPerformersCount: 5,
    worstPerformersCount: 5,
  },
  dashboard: {
    showAIInsights: true,
    showCharts: true,
    showRanking: true,
    showSmartDecisions: true,
  },
  automation: {
    dailyReports: true,
    weeklyReports: true,
    alerts: true,
  },
  import: {
    strictValidation: true,
    previewBeforeSave: true,
  },
};

export const SYSTEM_PRESET_LABELS: Record<SystemPreset, string> = {
  orders: 'شركة طلبات',
  attendance: 'شركة حضور',
  hybrid: 'Hybrid',
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
}

export function normalizeSystemAdvancedConfig(value: unknown): SystemAdvancedConfig {
  const root = asObject(value);
  const general = asObject(root.general);
  const salary = asObject(root.salary);
  const targets = asObject(root.targets);
  const ai = asObject(root.ai);
  const telegram = asObject(root.telegram);
  const alerts = asObject(root.alerts);
  const ranking = asObject(root.ranking);
  const dashboard = asObject(root.dashboard);
  const automation = asObject(root.automation);
  const importSettings = asObject(root.import);

  return {
    general: {
      currency: readString(general.currency, DEFAULT_SYSTEM_ADVANCED_CONFIG.general.currency),
      timezone: readString(general.timezone, DEFAULT_SYSTEM_ADVANCED_CONFIG.general.timezone),
      weekStartsOn: readEnum(
        general.weekStartsOn,
        ['saturday', 'sunday', 'monday'] as const,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.general.weekStartsOn,
      ),
    },
    salary: {
      ordersRate: readNumber(salary.ordersRate, DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.ordersRate),
      attendanceFixedSalary: readNumber(
        salary.attendanceFixedSalary,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.attendanceFixedSalary,
      ),
      hybridBaseSalary: readNumber(
        salary.hybridBaseSalary,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.hybridBaseSalary,
      ),
      hybridOrderRate: readNumber(
        salary.hybridOrderRate,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.hybridOrderRate,
      ),
      defaultBonus: readNumber(salary.defaultBonus, DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.defaultBonus),
      defaultDeductions: readNumber(
        salary.defaultDeductions,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.salary.defaultDeductions,
      ),
    },
    targets: {
      mode: readEnum(targets.mode, ['global', 'per_rider'] as const, DEFAULT_SYSTEM_ADVANCED_CONFIG.targets.mode),
      dailyOrders: readNumber(targets.dailyOrders, DEFAULT_SYSTEM_ADVANCED_CONFIG.targets.dailyOrders),
      monthlyOrders: readNumber(targets.monthlyOrders, DEFAULT_SYSTEM_ADVANCED_CONFIG.targets.monthlyOrders),
    },
    ai: {
      enabled: readBoolean(ai.enabled, DEFAULT_SYSTEM_ADVANCED_CONFIG.ai.enabled),
      analysisLevel: readEnum(
        ai.analysisLevel,
        ['simple', 'advanced'] as const,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.ai.analysisLevel,
      ),
      messageLength: readEnum(
        ai.messageLength,
        ['short', 'medium', 'long'] as const,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.ai.messageLength,
      ),
      chatEnabled: readBoolean(ai.chatEnabled, DEFAULT_SYSTEM_ADVANCED_CONFIG.ai.chatEnabled),
    },
    telegram: {
      botToken: readString(telegram.botToken, DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram.botToken),
      adminChatId: readString(telegram.adminChatId, DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram.adminChatId),
      dailyReportEnabled: readBoolean(
        telegram.dailyReportEnabled,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram.dailyReportEnabled,
      ),
      alertsEnabled: readBoolean(
        telegram.alertsEnabled,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram.alertsEnabled,
      ),
      riderMessagesEnabled: readBoolean(
        telegram.riderMessagesEnabled,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram.riderMessagesEnabled,
      ),
    },
    alerts: {
      lowPerformanceThreshold: readNumber(
        alerts.lowPerformanceThreshold,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.alerts.lowPerformanceThreshold,
      ),
      absenceDaysThreshold: readNumber(
        alerts.absenceDaysThreshold,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.alerts.absenceDaysThreshold,
      ),
      minimumOrdersPerDay: readNumber(
        alerts.minimumOrdersPerDay,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.alerts.minimumOrdersPerDay,
      ),
    },
    ranking: {
      scoringMode: readEnum(
        ranking.scoringMode,
        ['orders', 'attendance', 'hybrid'] as const,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking.scoringMode,
      ),
      topPerformersCount: readNumber(
        ranking.topPerformersCount,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking.topPerformersCount,
      ),
      worstPerformersCount: readNumber(
        ranking.worstPerformersCount,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking.worstPerformersCount,
      ),
    },
    dashboard: {
      showAIInsights: readBoolean(
        dashboard.showAIInsights,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.dashboard.showAIInsights,
      ),
      showCharts: readBoolean(
        dashboard.showCharts,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.dashboard.showCharts,
      ),
      showRanking: readBoolean(
        dashboard.showRanking,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.dashboard.showRanking,
      ),
      showSmartDecisions: readBoolean(
        dashboard.showSmartDecisions,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.dashboard.showSmartDecisions,
      ),
    },
    automation: {
      dailyReports: readBoolean(
        automation.dailyReports,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.automation.dailyReports,
      ),
      weeklyReports: readBoolean(
        automation.weeklyReports,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.automation.weeklyReports,
      ),
      alerts: readBoolean(automation.alerts, DEFAULT_SYSTEM_ADVANCED_CONFIG.automation.alerts),
    },
    import: {
      strictValidation: readBoolean(
        importSettings.strictValidation,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.import.strictValidation,
      ),
      previewBeforeSave: readBoolean(
        importSettings.previewBeforeSave,
        DEFAULT_SYSTEM_ADVANCED_CONFIG.import.previewBeforeSave,
      ),
    },
  };
}

export function toAdvancedConfigJson(config: SystemAdvancedConfig): Json {
  return config as unknown as Json;
}

export function getSystemPresetAdvancedConfig(preset: SystemPreset): SystemAdvancedConfig {
  switch (preset) {
    case 'orders':
      return {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
        targets: {
          mode: 'global',
          dailyOrders: 25,
          monthlyOrders: 650,
        },
        ranking: {
          ...DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking,
          scoringMode: 'orders',
        },
      };
    case 'attendance':
      return {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
        targets: {
          mode: 'global',
          dailyOrders: 0,
          monthlyOrders: 0,
        },
        alerts: {
          ...DEFAULT_SYSTEM_ADVANCED_CONFIG.alerts,
          lowPerformanceThreshold: 70,
          absenceDaysThreshold: 1,
        },
        ranking: {
          ...DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking,
          scoringMode: 'attendance',
        },
      };
    case 'hybrid':
    default:
      return {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
        ranking: {
          ...DEFAULT_SYSTEM_ADVANCED_CONFIG.ranking,
          scoringMode: 'hybrid',
        },
      };
  }
}

export function normalizeSystemSettings(settings: SystemSettingsRecordLike | null | undefined): NormalizedSystemSettings {
  const advancedConfig = normalizeSystemAdvancedConfig(settings?.advanced_config);

  return {
    id: readString(settings?.id, ''),
    project_name_ar: readString(settings?.project_name_ar, 'مهمة التوصيل'),
    project_name_en: readString(settings?.project_name_en, 'Muhimmat alTawseel'),
    project_subtitle_ar: readString(settings?.project_subtitle_ar, 'إدارة المناديب'),
    project_subtitle_en: readString(settings?.project_subtitle_en, 'Rider Management'),
    logo_url: typeof settings?.logo_url === 'string' ? settings.logo_url : null,
    default_language: readString(settings?.default_language, 'ar'),
    theme: readString(settings?.theme, 'light'),
    iqama_alert_days: readNumber(settings?.iqama_alert_days, 90),
    updated_at: typeof settings?.updated_at === 'string' ? settings.updated_at : null,
    advanced_config: toAdvancedConfigJson(advancedConfig),
    advancedConfig,
  };
}
