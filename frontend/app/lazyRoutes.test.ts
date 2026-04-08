import { describe, expect, it } from 'vitest';

const lazyRouteModules = [
  { label: 'Login', load: () => import('@modules/pages/Login'), exportName: 'default' },
  { label: 'ForgotPassword', load: () => import('@modules/pages/ForgotPassword'), exportName: 'default' },
  { label: 'ResetPassword', load: () => import('@modules/pages/ResetPassword'), exportName: 'default' },
  { label: 'Dashboard', load: () => import('@modules/pages/Dashboard'), exportName: 'default' },
  { label: 'Employees', load: () => import('@modules/employees/pages/EmployeesPage'), exportName: 'default' },
  { label: 'Attendance', load: () => import('@modules/pages/Attendance'), exportName: 'default' },
  { label: 'Orders', load: () => import('@modules/orders/pages/OrdersPage'), exportName: 'default' },
  { label: 'Salaries', load: () => import('@modules/salaries/pages/SalariesPage'), exportName: 'default' },
  { label: 'Advances', load: () => import('@modules/advances/pages/AdvancesPage'), exportName: 'default' },
  { label: 'Fuel', load: () => import('@modules/fuel/pages/FuelPage'), exportName: 'default' },
  { label: 'Maintenance', load: () => import('@modules/maintenance/pages/MaintenancePage'), exportName: 'default' },
  { label: 'Apps', load: () => import('@modules/pages/Apps'), exportName: 'default' },
  { label: 'AppSettingsPage', load: () => import('@modules/apps/pages/AppSettingsPage'), exportName: 'AppSettingsPage' },
  { label: 'Alerts', load: () => import('@modules/pages/Alerts'), exportName: 'default' },
  { label: 'SettingsHub', load: () => import('@modules/pages/SettingsHub'), exportName: 'default' },
  { label: 'ViolationResolverPage', load: () => import('@modules/violations/pages/ViolationResolverPage'), exportName: 'default' },
  { label: 'Motorcycles', load: () => import('@modules/pages/Motorcycles'), exportName: 'default' },
  { label: 'VehicleAssignment', load: () => import('@modules/pages/VehicleAssignment'), exportName: 'default' },
  { label: 'EmployeeTiers', load: () => import('@modules/pages/EmployeeTiers'), exportName: 'default' },
  { label: 'PlatformAccounts', load: () => import('@modules/pages/PlatformAccounts'), exportName: 'default' },
  { label: 'AiAnalytics', load: () => import('@modules/pages/AiAnalyticsPage'), exportName: 'default' },
  { label: 'ProfilePage', load: () => import('@modules/pages/ProfilePage'), exportName: 'default' },
  { label: 'NotFound', load: () => import('@modules/pages/NotFound'), exportName: 'default' },
] as const;

describe('lazy route modules', () => {
  it.each(lazyRouteModules)('keeps $label export available for React.lazy', async ({ load, exportName }) => {
    const module = await load();
    expect(module[exportName]).toBeTruthy();
  });
});
