import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock, rpcMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
    rpcMock: vi.fn(),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  handleSupabaseError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
}));

import { getTierSalaryExplanationLines, salaryService } from './salaryService';

describe('salaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tableResults).forEach((k) => delete tableResults[k]);
  });

  it('returns pricing rules on success', async () => {
    tableResults.pricing_rules = {
      data: [
        {
          id: 'r1',
          app_id: 'app-1',
          min_orders: 1,
          max_orders: 10,
          rule_type: 'per_order',
          rate_per_order: 7,
          fixed_salary: null,
          is_active: true,
          priority: 1,
        },
      ],
      error: null,
    };

    const result = await salaryService.getPricingRules('app-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
    expect(fromMock).toHaveBeenCalledWith('pricing_rules');
  });

  it('throws when pricing rules query fails', async () => {
    tableResults.pricing_rules = {
      data: null,
      error: new Error('db down'),
    };

    await expect(salaryService.getPricingRules('app-1')).rejects.toThrow(
      'salaryService.getPricingRules: db down',
    );
  });

  it('calculates tier salary for total multiplier logic', () => {
    const salary = salaryService.calculateTierSalary(
      12,
      [
        { from_orders: 1, to_orders: 10, price_per_order: 5, tier_order: 1 },
        { from_orders: 11, to_orders: null, price_per_order: 7, tier_order: 2 },
      ],
      null,
      null,
    );

    // 10*5 + 2*7 = 64
    expect(salary).toBe(64);
  });

  it('per_order_band: total orders × rate for the matched band only', () => {
    const tiers = [
      { from_orders: 1, to_orders: 300, price_per_order: 3, tier_order: 1, tier_type: 'per_order_band' as const },
      { from_orders: 301, to_orders: 400, price_per_order: 4, tier_order: 2, tier_type: 'per_order_band' as const },
      { from_orders: 401, to_orders: 449, price_per_order: 5, tier_order: 3, tier_type: 'per_order_band' as const },
      { from_orders: 450, to_orders: 470, price_per_order: 2500, tier_order: 4, tier_type: 'fixed_amount' as const },
      {
        from_orders: 471,
        to_orders: null,
        price_per_order: 2500,
        tier_order: 5,
        tier_type: 'base_plus_incremental' as const,
        incremental_threshold: 470,
        incremental_price: 5,
      },
    ];
    expect(salaryService.calculateTierSalary(400, tiers, null, null)).toBe(1600);
    expect(salaryService.calculateTierSalary(401, tiers, null, null)).toBe(2005);
    expect(salaryService.calculateTierSalary(450, tiers, null, null)).toBe(2500);
    expect(salaryService.calculateTierSalary(470, tiers, null, null)).toBe(2500);
    expect(salaryService.calculateTierSalary(480, tiers, null, null)).toBe(2550);
  });

  it('formats base_plus_incremental explanations in readable math order', () => {
    const explanation = getTierSalaryExplanationLines(
      542,
      [
        {
          from_orders: 471,
          to_orders: null,
          price_per_order: 2500,
          tier_order: 1,
          tier_type: 'base_plus_incremental',
          incremental_threshold: 460,
          incremental_price: 5,
        },
      ],
      null,
      null,
    );

    expect(explanation).toHaveLength(1);
    expect(explanation[0]).toContain('\u20662,500 + (542 - 460) × 5 = 2,910\u2069');
  });

  it('getByMonth returns array on success', async () => {
    tableResults.salary_records = {
      data: [{ id: 's1', employee_id: 'e1', month_year: '2026-03', net_salary: 5000 }],
      error: null,
    };

    const result = await salaryService.getByMonth('2026-03');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(fromMock).toHaveBeenCalledWith('salary_records');
  });

  it('getByMonth throws on Supabase error', async () => {
    tableResults.salary_records = {
      data: null,
      error: new Error('connection lost'),
    };

    await expect(salaryService.getByMonth('2026-03')).rejects.toThrow(
      'salaryService.getByMonth: connection lost',
    );
  });

  it('upsert throws on error — never swallows', async () => {
    tableResults.salary_records = {
      data: null,
      error: new Error('upsert conflict'),
    };

    await expect(
      salaryService.upsert({ employee_id: 'e1', month_year: '2026-03' }),
    ).rejects.toThrow('salaryService.upsert: upsert conflict');
  });

  it('update throws on error', async () => {
    tableResults.salary_records = {
      data: null,
      error: new Error('update failed'),
    };

    await expect(
      salaryService.update('s1', { net_salary: 3000 }),
    ).rejects.toThrow('salaryService.update: update failed');
  });

  it('delete throws on error', async () => {
    tableResults.salary_records = {
      data: null,
      error: new Error('delete denied'),
    };

    await expect(salaryService.delete('s1')).rejects.toThrow(
      'salaryService.delete: delete denied',
    );
  });

  it('applyPricingRules returns 0 salary when no rule matches', () => {
    const result = salaryService.applyPricingRules(
      [{ id: 'r1', app_id: 'a1', min_orders: 10, max_orders: 20, rule_type: 'per_order', rate_per_order: 5, fixed_salary: null }],
      5,
    );
    expect(result.salary).toBe(0);
    expect(result.matchedRule).toBeNull();
  });

  it('applyPricingRules calculates per_order correctly', () => {
    const result = salaryService.applyPricingRules(
      [{ id: 'r1', app_id: 'a1', min_orders: 1, max_orders: 100, rule_type: 'per_order', rate_per_order: 7, fixed_salary: null }],
      15,
    );
    expect(result.salary).toBe(105);
    expect(result.matchedRule?.id).toBe('r1');
  });

  it('applyPricingRules returns fixed salary for fixed rule', () => {
    const result = salaryService.applyPricingRules(
      [{ id: 'r1', app_id: 'a1', min_orders: 1, max_orders: null, rule_type: 'fixed', rate_per_order: null, fixed_salary: 2000 }],
      50,
    );
    expect(result.salary).toBe(2000);
  });

  it('calculateTierSalary returns 0 for zero orders', () => {
    const salary = salaryService.calculateTierSalary(
      0,
      [{ from_orders: 1, to_orders: 10, price_per_order: 5, tier_order: 1 }],
      null,
      null,
    );
    expect(salary).toBe(0);
  });

  it('calculateTierSalary adds target bonus when eligible', () => {
    const salary = salaryService.calculateTierSalary(
      15,
      [{ from_orders: 1, to_orders: null, price_per_order: 10, tier_order: 1 }],
      10,
      500,
    );
    // 15 * 10 = 150 + 500 bonus = 650
    expect(salary).toBe(650);
  });

  it('calculateFixedMonthlySalary prorates by attendance', () => {
    const salary = salaryService.calculateFixedMonthlySalary(3000, 20);
    // 3000/30 * 20 = 2000
    expect(salary).toBe(2000);
  });

  it('calculateFixedMonthlySalary returns 0 for zero amount', () => {
    expect(salaryService.calculateFixedMonthlySalary(0, 20)).toBe(0);
  });
});
