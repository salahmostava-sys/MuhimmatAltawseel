import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardEmployeePerformanceRow } from '@services/performanceService';
import { DEFAULT_SYSTEM_ADVANCED_CONFIG } from '@shared/lib/systemAdvancedConfig';

const { getDashboardDataMock, sendMessageMock, isConfiguredMock } = vi.hoisted(() => ({
  getDashboardDataMock: vi.fn(),
  sendMessageMock: vi.fn(),
  isConfiguredMock: vi.fn((config: { botToken?: string; adminChatId?: string }) =>
    Boolean(config.botToken?.trim() && config.adminChatId?.trim()),
  ),
}));

vi.mock('@services/performanceService', async () => {
  const actual = await vi.importActual<typeof import('@services/performanceService')>('@services/performanceService');
  return {
    ...actual,
    performanceService: {
      ...actual.performanceService,
      getDashboardData: getDashboardDataMock,
    },
  };
});

vi.mock('@services/telegramService', () => ({
  telegramService: {
    isConfigured: isConfiguredMock,
    sendMessage: sendMessageMock,
  },
}));

import {
  automationReportService,
  buildAutomationReportDocument,
  getAutomationAvailability,
} from './automationReportService';

function makeRow(overrides: Partial<DashboardEmployeePerformanceRow>): DashboardEmployeePerformanceRow {
  return {
    employeeId: 'emp-1',
    employeeName: 'أحمد',
    workType: 'hybrid',
    baseSalary: 3000,
    totalOrders: 520,
    activeOrderDays: 22,
    avgOrdersPerDay: 23.6,
    monthlyTargetOrders: 600,
    dailyTargetOrders: 20,
    targetAchievementPct: 86.7,
    daysPresent: 24,
    lateDays: 1,
    daysAbsent: 0,
    leaveDays: 0,
    sickDays: 0,
    attendanceRate: 96,
    deductions: 0,
    bonus: 0,
    orderSalaryComponent: 900,
    salary: 3900,
    salarySource: 'calculated',
    salaryApproved: false,
    performanceScore: 88,
    ordersByApp: [
      { appId: 'jahez', appName: 'جاهز', brandColor: '#111111', ordersCount: 320 },
    ],
    recentDailyOrders: [
      { date: '2026-04-08', orders: 20 },
      { date: '2026-04-07', orders: 22 },
    ],
    recentAttendance: [],
    aiPrompt: '',
    message: 'على المسار',
    city: 'مكة',
    phone: null,
    joinDate: '2025-01-01',
    rank: 1,
    ...overrides,
  };
}

describe('automationReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isConfiguredMock.mockImplementation((config: { botToken?: string; adminChatId?: string }) =>
      Boolean(config.botToken?.trim() && config.adminChatId?.trim()),
    );
  });

  it('builds a daily report document with decisions and rankings', () => {
    const config = {
      ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
      telegram: {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram,
        botToken: 'token',
        adminChatId: 'chat-1',
        dailyReportEnabled: true,
      },
    };

    const rows = [
      makeRow({ employeeId: '1', employeeName: 'أحمد', performanceScore: 91, totalOrders: 560 }),
      makeRow({ employeeId: '2', employeeName: 'سامي', performanceScore: 44, totalOrders: 180, daysAbsent: 3 }),
      makeRow({ employeeId: '3', employeeName: 'ليث', performanceScore: 70, totalOrders: 430 }),
    ];
    const previousRows = [
      makeRow({ employeeId: '1', employeeName: 'أحمد', performanceScore: 82, totalOrders: 500 }),
      makeRow({ employeeId: '2', employeeName: 'سامي', performanceScore: 48, totalOrders: 210, daysAbsent: 1 }),
      makeRow({ employeeId: '3', employeeName: 'ليث', performanceScore: 64, totalOrders: 390 }),
    ];

    const document = buildAutomationReportDocument({
      kind: 'daily',
      monthYear: '2026-04',
      settings: {
        projectName: 'مهمات التوصيل',
        advancedConfig: config,
      },
      rows,
      previousRows,
    });

    expect(document.title).toBe('التقرير اليومي التشغيلي');
    expect(document.message).toContain('مهمات التوصيل');
    expect(document.message).toContain('أفضل العناصر الآن');
    expect(document.message).toContain('أحمد');
    expect(document.message).toContain('سامي');
  });

  it('respects settings toggles when checking availability', () => {
    const availability = getAutomationAvailability('daily', {
      ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
      telegram: {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram,
        botToken: 'token',
        adminChatId: 'chat-1',
        dailyReportEnabled: false,
      },
    });

    expect(availability.enabled).toBe(false);
    expect(availability.reason).toContain('التقرير اليومي');
  });

  it('loads rows and sends the generated report to telegram', async () => {
    const config = {
      ...DEFAULT_SYSTEM_ADVANCED_CONFIG,
      telegram: {
        ...DEFAULT_SYSTEM_ADVANCED_CONFIG.telegram,
        botToken: 'token',
        adminChatId: 'chat-1',
        dailyReportEnabled: true,
      },
    };

    getDashboardDataMock
      .mockResolvedValueOnce([
        makeRow({ employeeId: '1', employeeName: 'أحمد', performanceScore: 91, totalOrders: 560 }),
      ])
      .mockResolvedValueOnce([
        makeRow({ employeeId: '1', employeeName: 'أحمد', performanceScore: 84, totalOrders: 500 }),
      ]);
    sendMessageMock.mockResolvedValue({ ok: true, message_id: 10 });

    const result = await automationReportService.sendReport('daily', '2026-04', {
      projectName: 'مهمات التوصيل',
      advancedConfig: config,
    });

    expect(getDashboardDataMock).toHaveBeenNthCalledWith(1, 'all', '2026-04');
    expect(getDashboardDataMock).toHaveBeenNthCalledWith(2, 'all', '2026-03');
    expect(sendMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      botToken: 'token',
      chatId: 'chat-1',
      text: expect.stringContaining('التقرير اليومي التشغيلي'),
    }));
    expect(result.title).toBe('التقرير اليومي التشغيلي');
    expect(result.targetChatId).toBe('chat-1');
  });
});
