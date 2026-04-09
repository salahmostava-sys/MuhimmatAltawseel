import { useEffect, useRef } from 'react';
import { realtimeService } from '@services/realtimeService';

/** Tables backing Dashboard KPIs + analytics (invalidate on change; read-heavy). */
export const REALTIME_TABLES_DASHBOARD = [
  'employees',
  'attendance',
  'daily_orders',
  'audit_log',
  'vehicles',
  'alerts',
  'apps',
  'app_targets',
] as const;

export const REALTIME_TABLES_ALERTS_PAGE = ['employees', 'vehicles', 'platform_accounts', 'alerts'] as const;

export const REALTIME_TABLES_ALERTS_WIDGET = ['employees', 'vehicles'] as const;

/** Subscribe to postgres_changes on the given tables; cleanup on unmount. */
export function useRealtimePostgresChanges(
  channelName: string,
  tables: readonly string[],
  onEvent: () => void
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    return realtimeService.subscribeToTables(channelName, tables, () => onEventRef.current());
  }, [channelName, tables]);
}
