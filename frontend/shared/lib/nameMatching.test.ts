import { describe, expect, it } from 'vitest';
import { matchEmployeeNames } from './nameMatching';

describe('matchEmployeeNames', () => {
  it('keeps low-confidence matches for manual review while still suggesting likely employees', () => {
    const result = matchEmployeeNames(
      ['محمود علي'],
      [
        { id: 'emp-1', name: 'محمد علي' },
        { id: 'emp-2', name: 'خالد سالم' },
      ],
    );

    expect(result.matched.size).toBe(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0]).toMatchObject({
      name: 'محمود علي',
      reason: 'low-confidence',
    });
    expect(result.unmatched[0].suggestions[0]).toMatchObject({
      id: 'emp-1',
      name: 'محمد علي',
    });
    expect(result.unmatched[0].bestSimilarity).toBeLessThan(90);
  });

  it('still auto-matches names when confidence is high', () => {
    const result = matchEmployeeNames(
      ['محمد'],
      [
        { id: 'emp-1', name: 'محمد علي' },
        { id: 'emp-2', name: 'أحمد سالم' },
      ],
    );

    expect(result.unmatched).toHaveLength(0);
    expect(result.matched.get('محمد')).toMatchObject({
      id: 'emp-1',
      name: 'محمد علي',
    });
    expect(result.matched.get('محمد')?.similarity).toBeGreaterThanOrEqual(90);
  });
});
