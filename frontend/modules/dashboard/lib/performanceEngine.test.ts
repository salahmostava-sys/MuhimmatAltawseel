import { describe, it, expect } from 'vitest';
import {
  computeGrowthRate,
  computePerformanceScore,
  classifyPerformance,
  compareValues,
  enrichWithDelta,
  formatGrowthPct,
  buildRiderProfiles,
  tierLabel,
  tierColorClass,
  tierBgClass,
} from './performanceEngine';

describe('computeGrowthRate', () => {
  it('returns positive growth', () => {
    const result = computeGrowthRate(450, 400);
    expect(result.rate).toBe(12.5);
    expect(result.direction).toBe('↑');
  });

  it('returns negative growth', () => {
    const result = computeGrowthRate(350, 400);
    expect(result.rate).toBe(-12.5);
    expect(result.direction).toBe('↓');
  });

  it('returns stable when no change', () => {
    const result = computeGrowthRate(400, 400);
    expect(result.direction).toBe('→');
  });

  it('returns stable for small changes (<2%)', () => {
    const result = computeGrowthRate(401, 400);
    expect(result.direction).toBe('→');
  });

  it('handles zero previous', () => {
    const result = computeGrowthRate(100, 0);
    expect(result.rate).toBe(100);
    expect(result.direction).toBe('↑');
  });

  it('handles both zero', () => {
    const result = computeGrowthRate(0, 0);
    expect(result.rate).toBe(0);
    expect(result.direction).toBe('→');
  });
});

describe('computePerformanceScore', () => {
  it('returns a score between 0 and 100', () => {
    const score = computePerformanceScore({
      totalOrders: 300,
      avgOrdersPerDay: 10,
      activeDays: 30,
      consistencyRatio: 0.8,
      growthPct: 10,
      targetAchievementPct: 90,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher score for better metrics', () => {
    const good = computePerformanceScore({
      totalOrders: 500,
      avgOrdersPerDay: 17,
      activeDays: 30,
      consistencyRatio: 0.9,
      growthPct: 20,
      targetAchievementPct: 100,
      medianOrders: 300,
    });

    const bad = computePerformanceScore({
      totalOrders: 50,
      avgOrdersPerDay: 3,
      activeDays: 15,
      consistencyRatio: 0.3,
      growthPct: -30,
      targetAchievementPct: 20,
      medianOrders: 300,
    });

    expect(good).toBeGreaterThan(bad);
  });

  it('caps score at 100', () => {
    const score = computePerformanceScore({
      totalOrders: 10000,
      avgOrdersPerDay: 333,
      activeDays: 30,
      consistencyRatio: 1.0,
      growthPct: 100,
      targetAchievementPct: 200,
      medianOrders: 300,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles zero values', () => {
    const score = computePerformanceScore({
      totalOrders: 0,
      avgOrdersPerDay: 0,
      activeDays: 0,
      consistencyRatio: 0,
      growthPct: 0,
      targetAchievementPct: 0,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('classifyPerformance', () => {
  it('returns excellent for 85+', () => {
    expect(classifyPerformance(85)).toBe('excellent');
    expect(classifyPerformance(100)).toBe('excellent');
  });

  it('returns good for 70-84', () => {
    expect(classifyPerformance(70)).toBe('good');
    expect(classifyPerformance(84)).toBe('good');
  });

  it('returns average for 50-69', () => {
    expect(classifyPerformance(50)).toBe('average');
    expect(classifyPerformance(69)).toBe('average');
  });

  it('returns weak for <50', () => {
    expect(classifyPerformance(0)).toBe('weak');
    expect(classifyPerformance(49)).toBe('weak');
  });
});

describe('tierLabel', () => {
  it('returns Arabic labels', () => {
    expect(tierLabel('excellent')).toBe('ممتاز');
    expect(tierLabel('good')).toBe('جيد');
    expect(tierLabel('average')).toBe('متوسط');
    expect(tierLabel('weak')).toBe('ضعيف');
  });
});

describe('tierColorClass / tierBgClass', () => {
  it('returns valid CSS classes', () => {
    expect(tierColorClass('excellent')).toContain('emerald');
    expect(tierBgClass('weak')).toContain('rose');
  });
});

describe('compareValues', () => {
  it('detects positive delta', () => {
    const result = compareValues(500, 400);
    expect(result.delta).toBe(100);
    expect(result.direction).toBe('↑');
    expect(result.formattedDelta).toContain('+');
  });

  it('detects negative delta', () => {
    const result = compareValues(300, 400);
    expect(result.delta).toBe(-100);
    expect(result.direction).toBe('↓');
  });

  it('handles stable', () => {
    const result = compareValues(400, 400);
    expect(result.direction).toBe('→');
  });
});

describe('enrichWithDelta', () => {
  it('enriches with delta when previous exists', () => {
    const result = enrichWithDelta(450, 400, 'طلب');
    expect(result.enrichedText).toContain('450');
    expect(result.enrichedText).toContain('↑');
    expect(result.delta).not.toBeNull();
  });

  it('returns plain value when no previous', () => {
    const result = enrichWithDelta(450, null, 'طلب');
    expect(result.enrichedText).toContain('450');
    expect(result.delta).toBeNull();
  });

  it('returns plain value when previous is 0', () => {
    const result = enrichWithDelta(450, 0);
    expect(result.delta).toBeNull();
  });
});

describe('formatGrowthPct', () => {
  it('formats positive growth', () => {
    const result = formatGrowthPct(15);
    expect(result).toContain('+15');
    expect(result).toContain('↑');
  });

  it('formats negative growth', () => {
    const result = formatGrowthPct(-10);
    expect(result).toContain('↓');
  });
});

describe('buildRiderProfiles', () => {
  it('builds profiles with scores from ranking entries', () => {
    const entries = [
      {
        employeeId: '1',
        employeeName: 'أحمد',
        city: 'makkah',
        totalOrders: 500,
        activeDays: 28,
        avgOrdersPerDay: 17.86,
        consistencyRatio: 0.85,
        growthPct: 15,
        targetAchievementPct: 95,
        rank: 1,
        trendCode: 'up' as const,
      },
      {
        employeeId: '2',
        employeeName: 'محمد',
        city: 'jeddah',
        totalOrders: 200,
        activeDays: 20,
        avgOrdersPerDay: 10,
        consistencyRatio: 0.5,
        growthPct: -10,
        targetAchievementPct: 40,
        rank: 2,
        trendCode: 'down' as const,
      },
    ];

    const profiles = buildRiderProfiles(entries);
    expect(profiles).toHaveLength(2);
    expect(profiles[0].performanceScore).toBeGreaterThan(profiles[1].performanceScore);
    expect(profiles[0].tier).toBeDefined();
    expect(profiles[0].growthDirection).toBe('↑');
  });

  it('handles empty entries', () => {
    const profiles = buildRiderProfiles([]);
    expect(profiles).toHaveLength(0);
  });
});
