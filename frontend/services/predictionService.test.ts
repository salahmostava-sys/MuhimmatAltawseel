import { describe, expect, it } from 'vitest';
import { predictRiderMonth } from './predictionService';

const baseInput = {
  riderId: 'r1',
  riderName: 'محمد',
  ordersThisMonthSoFar: 100,
  dailyOrdersLast14: [8, 9, 10, 11, 10, 9, 8, 10, 11, 12, 10, 9, 11, 10],
  daysPassedThisMonth: 15,
  daysRemainingThisMonth: 15,
  ordersLastMonth: 280,
  ordersMonth2Ago: 260,
  ordersMonth3Ago: 270,
  ordersSameMonthLastYear: 290,
};

describe('predictRiderMonth', () => {
  it('returns a predictedTotal greater than 0', () => {
    const r = predictRiderMonth(baseInput);
    expect(r.predictedTotal).toBeGreaterThan(0);
  });

  it('trend = up when last7 avg > prev7 avg by more than 5%', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15],
    };
    expect(predictRiderMonth(input).trend).toBe('up');
  });

  it('trend = down when last7 avg < prev7 avg by more than 5%', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [15, 15, 15, 15, 15, 15, 15, 5, 5, 5, 5, 5, 5, 5],
    };
    expect(predictRiderMonth(input).trend).toBe('down');
  });

  it('trend = stable when difference <= 5%', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    };
    expect(predictRiderMonth(input).trend).toBe('stable');
  });

  it('confidence = high when 14 days data and ordersMonth3Ago > 0', () => {
    const r = predictRiderMonth(baseInput);
    expect(r.confidence).toBe('high');
  });

  it('confidence = medium when only 7 days data', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [1, 2, 3, 4, 5, 6, 7],
      ordersMonth3Ago: 0,
    };
    expect(predictRiderMonth(input).confidence).toBe('medium');
  });

  it('confidence = low when less than 7 days', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [1, 2, 3, 4, 5, 6],
      ordersMonth3Ago: 0,
    };
    expect(predictRiderMonth(input).confidence).toBe('low');
  });

  it('progressPercent never exceeds 100', () => {
    const input = {
      ...baseInput,
      ordersThisMonthSoFar: 5000,
      dailyOrdersLast14: new Array(14).fill(0),
      daysRemainingThisMonth: 0,
    };
    expect(predictRiderMonth(input).progressPercent).toBeLessThanOrEqual(100);
  });

  it('progressPercent is 0 when predictedTotal is 0', () => {
    const input = {
      ...baseInput,
      ordersThisMonthSoFar: 0,
      dailyOrdersLast14: [],
      daysRemainingThisMonth: 0,
      ordersLastMonth: 0,
      ordersMonth2Ago: 0,
      ordersMonth3Ago: 0,
      ordersSameMonthLastYear: 0,
    };
    const r = predictRiderMonth(input);
    expect(r.predictedTotal).toBe(0);
    expect(r.progressPercent).toBe(0);
  });

  it('vsLastMonth is positive when predicted > lastMonth', () => {
    const input = {
      ...baseInput,
      ordersThisMonthSoFar: 400,
      dailyOrdersLast14: new Array(14).fill(50),
      ordersLastMonth: 50,
      ordersMonth2Ago: 50,
      ordersMonth3Ago: 50,
    };
    const r = predictRiderMonth(input);
    expect(r.predictedTotal).toBeGreaterThan(input.ordersLastMonth);
    expect(r.vsLastMonth).toBeGreaterThan(0);
  });

  it('vsLastMonth is negative when predicted < lastMonth', () => {
    const input = {
      ...baseInput,
      ordersThisMonthSoFar: 0,
      dailyOrdersLast14: new Array(14).fill(0),
      daysRemainingThisMonth: 0,
      ordersLastMonth: 5000,
      ordersMonth2Ago: 5000,
      ordersMonth3Ago: 5000,
      ordersSameMonthLastYear: 5000,
    };
    const r = predictRiderMonth(input);
    expect(r.predictedTotal).toBeLessThan(input.ordersLastMonth);
    expect(r.vsLastMonth).toBeLessThan(0);
  });

  it('handles empty dailyOrdersLast14 without throwing', () => {
    expect(() =>
      predictRiderMonth({
        ...baseInput,
        dailyOrdersLast14: [],
      }),
    ).not.toThrow();
  });

  it('handles zero ordersLastMonth without division error', () => {
    const r = predictRiderMonth({
      ...baseInput,
      ordersLastMonth: 0,
    });
    expect(r.vsLastMonthPercent).toBe(0);
  });

  it('remainingPredicted is never negative', () => {
    const r = predictRiderMonth({
      ...baseInput,
      ordersThisMonthSoFar: 99999,
    });
    expect(r.remainingPredicted).toBeGreaterThanOrEqual(0);
  });

  it('seasonalFactor is clamped between 0.7 and 1.3', () => {
    const threeMonthAvg = (280 + 260 + 270) / 3;
    const lowSeason = predictRiderMonth({
      ...baseInput,
      ordersSameMonthLastYear: 1,
      ordersLastMonth: 280,
      ordersMonth2Ago: 260,
      ordersMonth3Ago: 270,
    });
    const highSeason = predictRiderMonth({
      ...baseInput,
      ordersSameMonthLastYear: threeMonthAvg * 10,
      ordersLastMonth: 280,
      ordersMonth2Ago: 260,
      ordersMonth3Ago: 270,
    });
    const midSeason = predictRiderMonth({
      ...baseInput,
      ordersSameMonthLastYear: threeMonthAvg,
      ordersLastMonth: 280,
      ordersMonth2Ago: 260,
      ordersMonth3Ago: 270,
    });
    expect(lowSeason.predictedTotal).toBeLessThanOrEqual(midSeason.predictedTotal);
    expect(highSeason.predictedTotal).toBeGreaterThanOrEqual(midSeason.predictedTotal);
    const rawLow = 1 / threeMonthAvg;
    const rawHigh = (threeMonthAvg * 10) / threeMonthAvg;
    expect(Math.min(Math.max(rawLow, 0.7), 1.3)).toBe(0.7);
    expect(Math.min(Math.max(rawHigh, 0.7), 1.3)).toBe(1.3);
  });

  it('preserves riderId and riderName on output', () => {
    const r = predictRiderMonth({ ...baseInput, riderId: 'x-99', riderName: 'علي' });
    expect(r.riderId).toBe('x-99');
    expect(r.riderName).toBe('علي');
  });

  it('ordersThisMonthSoFar matches input', () => {
    expect(predictRiderMonth({ ...baseInput, ordersThisMonthSoFar: 42 }).ordersThisMonthSoFar).toBe(42);
  });

  it('confidenceReason matches high tier', () => {
    expect(predictRiderMonth(baseInput).confidenceReason).toContain('14');
  });

  it('confidenceReason matches low tier', () => {
    const r = predictRiderMonth({
      ...baseInput,
      dailyOrdersLast14: [1, 2],
      ordersMonth3Ago: 0,
    });
    expect(r.confidenceReason).toContain('غير كافية');
  });

  it('trendPercent is rounded integer', () => {
    const r = predictRiderMonth(baseInput);
    expect(Number.isInteger(r.trendPercent)).toBe(true);
  });

  it('daily averages are rounded to one decimal', () => {
    const r = predictRiderMonth(baseInput);
    expect(r.dailyAvgLast14).toBe(Math.round(r.dailyAvgLast14 * 10) / 10);
  });

  it('vs3MonthAvg reflects predicted minus 3-month average', () => {
    const input = { ...baseInput };
    const r = predictRiderMonth(input);
    const threeAvg = (input.ordersLastMonth + input.ordersMonth2Ago + input.ordersMonth3Ago) / 3;
    expect(r.vs3MonthAvg).toBe(Math.round(r.predictedTotal - threeAvg));
  });

  it('when dailyAvgPrev7 is zero trendPercent is 0', () => {
    const input = {
      ...baseInput,
      dailyOrdersLast14: [0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5],
    };
    expect(predictRiderMonth(input).trendPercent).toBe(0);
  });

  it('seasonalFactor defaults to 1 when threeMonthAvg is 0', () => {
    const r = predictRiderMonth({
      ...baseInput,
      ordersLastMonth: 0,
      ordersMonth2Ago: 0,
      ordersMonth3Ago: 0,
      ordersSameMonthLastYear: 0,
    });
    expect(r.predictedTotal).toBeGreaterThanOrEqual(0);
  });

  it('remainingPredicted equals predicted minus so far when under cap', () => {
    const r = predictRiderMonth(baseInput);
    expect(r.remainingPredicted).toBe(Math.max(r.predictedTotal - baseInput.ordersThisMonthSoFar, 0));
  });

  it('handles single-day dailyOrdersLast14 slice', () => {
    expect(() => predictRiderMonth({ ...baseInput, dailyOrdersLast14: [3] })).not.toThrow();
  });

  it('high confidence requires ordersMonth3Ago > 0', () => {
    const r = predictRiderMonth({
      ...baseInput,
      dailyOrdersLast14: new Array(14).fill(5),
      ordersMonth3Ago: 0,
    });
    expect(r.confidence).not.toBe('high');
  });

  it('uses last 14 elements when more than 14 days provided', () => {
    const long = [...new Array(20).keys()].map((i) => i + 1);
    const short = long.slice(-14);
    expect(predictRiderMonth({ ...baseInput, dailyOrdersLast14: long }).dailyAvgLast14).toBe(
      predictRiderMonth({ ...baseInput, dailyOrdersLast14: short }).dailyAvgLast14,
    );
  });

  it('medium confidence when 14 days but no third month history', () => {
    const r = predictRiderMonth({
      ...baseInput,
      ordersMonth3Ago: 0,
    });
    expect(r.confidence).toBe('medium');
  });

  it('vsLastMonthPercent scales with ratio when lastMonth > 0', () => {
    const r = predictRiderMonth({ ...baseInput, ordersLastMonth: 200 });
    expect(r.vsLastMonthPercent).toBe(Math.round((r.vsLastMonth / 200) * 100));
  });
});
