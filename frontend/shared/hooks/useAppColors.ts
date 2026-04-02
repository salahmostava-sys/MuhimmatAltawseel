import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appService } from '@services/appService';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';

export interface CustomColumn {
  key: string;
  label: string;
}

export interface AppColorData {
  id: string;
  name: string;
  brand_color: string;
  text_color: string;
  is_active: boolean;
  custom_columns?: CustomColumn[];
}

const FALLBACK_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#dc2626'];

export const appColorsQueryKey = (userId: string) => ['apps', userId, 'colors'] as const;

const normalizeCustomColumns = (value: unknown): CustomColumn[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { key?: unknown }).key === 'string' &&
      typeof (item as { label?: unknown }).label === 'string'
    ) {
      return [
        {
          key: (item as { key: string }).key,
          label: (item as { label: string }).label,
        },
      ];
    }

    return [];
  });
};

export const getAppColor = (apps: AppColorData[], appName: string) => {
  const idx = Math.max(0, apps.findIndex((app) => app.name === appName));
  const app = apps.find((item) => item.name === appName);
  const brand = app?.brand_color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const text = app?.text_color || '#ffffff';
  return {
    bg: `${brand}22`,
    text: brand,
    solid: brand,
    solidText: text,
  };
};

export const useAppColors = () => {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);

  const query = useQuery({
    queryKey: appColorsQueryKey(uid),
    enabled,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<AppColorData[]> => {
      const apps = await appService.getAll();
      return apps.map((app, index) => ({
        id: app.id,
        name: app.name,
        brand_color: app.brand_color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        text_color: app.text_color || '#ffffff',
        is_active: app.is_active ?? true,
        custom_columns: normalizeCustomColumns(app.custom_columns),
      }));
    },
  });

  const apps = query.data;
  const activeApps = useMemo(() => (apps ?? []).filter((app) => app.is_active), [apps]);
  return { apps: apps ?? [], activeApps, loading: query.isLoading };
};

export default useAppColors;
