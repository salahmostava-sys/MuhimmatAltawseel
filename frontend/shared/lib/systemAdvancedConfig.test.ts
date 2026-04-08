import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SYSTEM_ADVANCED_CONFIG,
  getSystemPresetAdvancedConfig,
  normalizeSystemAdvancedConfig,
  normalizeSystemSettings,
} from './systemAdvancedConfig';

describe('systemAdvancedConfig', () => {
  it('normalizes missing config to sensible defaults', () => {
    expect(normalizeSystemAdvancedConfig(null)).toEqual(DEFAULT_SYSTEM_ADVANCED_CONFIG);
  });

  it('keeps valid overrides and falls back for invalid enum values', () => {
    const config = normalizeSystemAdvancedConfig({
      general: { currency: 'USD', weekStartsOn: 'friday' },
      alerts: { lowPerformanceThreshold: 62 },
      ai: { analysisLevel: 'simple', chatEnabled: false },
    });

    expect(config.general.currency).toBe('USD');
    expect(config.general.weekStartsOn).toBe(DEFAULT_SYSTEM_ADVANCED_CONFIG.general.weekStartsOn);
    expect(config.alerts.lowPerformanceThreshold).toBe(62);
    expect(config.ai.analysisLevel).toBe('simple');
    expect(config.ai.chatEnabled).toBe(false);
  });

  it('builds preset-specific overrides', () => {
    const orders = getSystemPresetAdvancedConfig('orders');
    const attendance = getSystemPresetAdvancedConfig('attendance');

    expect(orders.ranking.scoringMode).toBe('orders');
    expect(orders.targets.monthlyOrders).toBeGreaterThan(0);
    expect(attendance.ranking.scoringMode).toBe('attendance');
    expect(attendance.targets.monthlyOrders).toBe(0);
  });

  it('normalizes a settings row and exposes parsed advancedConfig', () => {
    const settings = normalizeSystemSettings({
      project_name_ar: 'نظام الشركة',
      iqama_alert_days: 45,
      advanced_config: {
        general: { timezone: 'Asia/Dubai' },
      },
    });

    expect(settings.project_name_ar).toBe('نظام الشركة');
    expect(settings.iqama_alert_days).toBe(45);
    expect(settings.advancedConfig.general.timezone).toBe('Asia/Dubai');
    expect(settings.advanced_config).toBeTruthy();
  });
});
