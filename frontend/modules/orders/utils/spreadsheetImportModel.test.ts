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
    expect(result.errors[0]).toContain('أكثر من منصة');
  });

  it('imports employees to target app even if not assigned (assignment not required for import)', () => {
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

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('replaces previous values inside the imported employee and app scope', () => {
    const result = mergeImportedOrdersFromMatrixWithMapping({
      matrixRows: [['أحمد', 12, '']],
      dayArr: [1, 2],
      apps,
      prev: {
        'emp-1::orders-app::1': 5,
        'emp-1::orders-app::2': 9,
        'emp-1::hybrid-app::1': 3,
      },
      targetAppId: 'orders-app',
      nameMapping: new Map([['أحمد', 'emp-1']]),
      appEmployeeIds: {
        'orders-app': new Set(['emp-1']),
        'hybrid-app': new Set(),
      },
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.newData).toEqual({
      'emp-1::orders-app::1': 12,
      'emp-1::hybrid-app::1': 3,
    });
  });

  it('clears a duplicated employee scope only once so repeated rows keep all imported days', () => {
    const result = mergeImportedOrdersFromMatrixWithMapping({
      matrixRows: [
        ['أحمد', 12, ''],
        ['أحمد', '', 7],
      ],
      dayArr: [1, 2],
      apps,
      prev: {
        'emp-1::orders-app::1': 2,
        'emp-1::orders-app::2': 4,
      },
      nameMapping: new Map([['أحمد', 'emp-1']]),
      appEmployeeIds: {
        'orders-app': new Set(['emp-1']),
        'hybrid-app': new Set(),
      },
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.newData).toEqual({
      'emp-1::orders-app::1': 12,
      'emp-1::orders-app::2': 7,
    });
  });
});
