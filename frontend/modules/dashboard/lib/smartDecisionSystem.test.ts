import { describe, expect, it } from 'vitest';

import type { DashboardEmployeePerformanceRow } from '@services/performanceService';
import { DEFAULT_SYSTEM_ADVANCED_CONFIG } from '@shared/lib/systemAdvancedConfig';

import {
  buildDashboardDecisionSnapshot,
  filterDashboardRows,
  getDashboardPerformanceBand,
} from './smartDecisionSystem';

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
      { date: '2026-04-01', orders: 20 },
      { date: '2026-04-02', orders: 22 },
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

describe('smartDecisionSystem', () => {
  it('classifies rows into performance bands using configurable thresholds', () => {
    expect(
      getDashboardPerformanceBand(makeRow({ performanceScore: 45 }), DEFAULT_SYSTEM_ADVANCED_CONFIG),
    ).toBe('low');
    expect(
      getDashboardPerformanceBand(makeRow({ performanceScore: 90 }), DEFAULT_SYSTEM_ADVANCED_CONFIG),
    ).toBe('top');
    expect(
      getDashboardPerformanceBand(makeRow({ performanceScore: 72 }), DEFAULT_SYSTEM_ADVANCED_CONFIG),
    ).toBe('average');
  });

  it('filters by type, platform, and performance band', () => {
    const rows = [
      makeRow({ employeeId: '1', workType: 'orders', performanceScore: 90 }),
      makeRow({ employeeId: '2', workType: 'attendance', performanceScore: 50 }),
      makeRow({
        employeeId: '3',
        workType: 'hybrid',
        performanceScore: 40,
        ordersByApp: [{ appId: 'toyou', appName: 'تويو', brandColor: '#222222', ordersCount: 120 }],
      }),
    ];

    const filtered = filterDashboardRows(rows, {
      config: DEFAULT_SYSTEM_ADVANCED_CONFIG,
      filterType: 'hybrid',
      platformId: 'toyou',
      performanceBand: 'low',
    });

    expect(filtered.map((row) => row.employeeId)).toEqual(['3']);
  });

  it('builds smart insights, awards, and analytics from current and previous rows', () => {
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

    const snapshot = buildDashboardDecisionSnapshot({
      rows,
      previousRows,
      config: DEFAULT_SYSTEM_ADVANCED_CONFIG,
      filterType: 'all',
      platformId: 'all',
      performanceBand: 'all',
    });

    expect(snapshot.filteredRows).toHaveLength(3);
    expect(snapshot.targetSummary.target).toBe(1800);
    expect(snapshot.smartInsights.some((insight) => insight.id === 'low-performers')).toBe(true);
    expect(snapshot.smartInsights.some((insight) => insight.id === 'absence-risk')).toBe(true);
    expect(snapshot.awards[0].employeeName).toBeTruthy();
    expect(snapshot.improvementRate).toBeGreaterThan(0);
  });
});
