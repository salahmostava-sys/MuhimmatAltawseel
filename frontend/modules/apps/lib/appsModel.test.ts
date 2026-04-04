import { describe, expect, it } from 'vitest';
import { buildAppsOverview } from './appsModel';

describe('buildAppsOverview', () => {
  it('counts visible assigned riders from employee data instead of order rows', () => {
    const result = buildAppsOverview(
      [
        {
          id: 'app-1',
          name: 'Keeta',
          name_en: null,
          brand_color: '#111111',
          text_color: '#ffffff',
          is_active: true,
          work_type: 'orders',
          custom_columns: [],
        },
      ],
      [
        { app_id: 'app-1', employee_id: 'emp-1', orders_count: 10 },
        { app_id: 'app-1', employee_id: 'emp-2', orders_count: 5 },
      ],
      [
        {
          app_id: 'app-1',
          employee_id: 'emp-1',
          employees: {
            id: 'emp-1',
            name: 'أحمد',
            status: 'active',
            sponsorship_status: null,
          },
        },
        {
          app_id: 'app-1',
          employee_id: 'emp-3',
          employees: {
            id: 'emp-3',
            name: 'موقوف',
            status: 'inactive',
            sponsorship_status: null,
          },
        },
        {
          app_id: 'app-1',
          employee_id: 'emp-4',
          employees: {
            id: 'emp-4',
            name: 'منتهي',
            status: 'active',
            sponsorship_status: 'terminated',
          },
        },
      ],
    );

    expect(result[0]).toMatchObject({
      employeeCount: 1,
      ordersCount: 15,
      work_type: 'orders',
    });
  });
});
