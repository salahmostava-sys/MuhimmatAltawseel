import { describe, expect, it } from 'vitest';
import { mergeImportedOrdersFromMatrixWithMapping } from './spreadsheetImportModel';

const apps = [
  { id: 'orders-app', name: 'طلبات', name_en: null, work_type: 'orders' as const },
  { id: 'hybrid-app', name: 'مختلط', name_en: null, work_type: 'hybrid' as const },
];

describe('mergeImportedOrdersFromMatrixWithMapping', () => {
  it('uses the employee assigned order app when smart import is selected', () => {
    const result = mergeImportedOrdersFromMatrixWithMapping({
      matrixRows: [['أحمد', 12]],
      dayArr: [1],
      apps,
      prev: {},
      nameMapping: new Map([['أحمد', 'emp-1']]),
      appEmployeeIds: {
        'orders-app': new Set(['emp-1']),
        'hybrid-app': new Set(),
      },
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.newData).toEqual({
      'emp-1::orders-app::1': 12,
    });
  });

  it('skips employees assigned to multiple order-capable apps in smart import mode', () => {
    const result = mergeImportedOrdersFromMatrixWithMapping({
      matrixRows: [['أحمد', 12]],
      dayArr: [1],
      apps,
      prev: {},
      nameMapping: new Map([['أحمد', 'emp-1']]),
      appEmployeeIds: {
        'orders-app': new Set(['emp-1']),
        'hybrid-app': new Set(['emp-1']),
      },
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toContain('أكثر من منصة طلبات');
  });

  it('skips employees not assigned to the selected target app', () => {
    const result = mergeImportedOrdersFromMatrixWithMapping({
      matrixRows: [['أحمد', 12]],
      dayArr: [1],
      apps,
      prev: {},
      targetAppId: 'orders-app',
      nameMapping: new Map([['أحمد', 'emp-1']]),
      appEmployeeIds: {
        'orders-app': new Set(),
        'hybrid-app': new Set(['emp-1']),
      },
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toContain('غير مسجل على منصة');
  });
});
