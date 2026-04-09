export const appsRootQueryKey = ['apps'] as const;

export const appsOverviewQueryKey = (userId: string, monthYear: string) =>
  ['apps', userId, 'overview', monthYear] as const;

export const appEmployeesQueryKey = (userId: string, monthYear: string, appId: string) =>
  ['apps', userId, 'employees', monthYear, appId] as const;
