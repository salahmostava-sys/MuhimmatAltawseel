import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@app/providers/AuthContext';
import { logError } from '@shared/lib/logger';
import {
  normalizeSystemSettings,
  type NormalizedSystemSettings,
} from '@shared/lib/systemAdvancedConfig';
import { settingsHubService } from '@services/settingsHubService';

export type SystemSettings = NormalizedSystemSettings;

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  projectName: string;
  projectSubtitle: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const defaults: SystemSettings = normalizeSystemSettings(null);

const SystemSettingsContext = createContext<SystemSettingsContextType>({
  settings: defaults,
  projectName: defaults.project_name_ar,
  projectSubtitle: defaults.project_subtitle_ar,
  loading: true,
  refresh: async () => {},
});

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, authLoading } = useAuth();
  const enabled = !!session && !!user && !authLoading;

  const query = useQuery({
    queryKey: ['system-settings', user?.id ?? '__guest__'] as const,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const data = await settingsHubService.getSystemSettings();
        return normalizeSystemSettings(data as SystemSettings | null);
      } catch (error) {
        logError('[SystemSettingsContext] fetch settings failed', error);
        return defaults;
      }
    },
  });

  const settings = query.data ?? defaults;
  const loading = enabled ? query.isLoading : authLoading;
  const projectName = settings.project_name_ar;
  const projectSubtitle = settings.project_subtitle_ar;

  const contextValue = useMemo<SystemSettingsContextType>(
    () => ({
      settings,
      projectName,
      projectSubtitle,
      loading,
      refresh: async () => {
        await query.refetch();
      },
    }),
    [loading, projectName, projectSubtitle, query, settings],
  );

  useEffect(() => {
    document.title = projectName;
  }, [projectName]);

  return (
    <SystemSettingsContext.Provider value={contextValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => useContext(SystemSettingsContext);
