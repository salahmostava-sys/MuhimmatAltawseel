import { supabase } from '@services/supabase/client';

export const realtimeService = {
  /**
   * Subscribe to Postgres changes on one or more tables.
   * Returns an unsubscribe function. Call it in useEffect cleanup.
   *
   * Uses Supabase Realtime WebSocket (not polling).
   * Tables should have REPLICA IDENTITY FULL for full row data.
   */
  subscribeToTables: (
    channelName: string,
    tables: readonly string[],
    onEvent: () => void,
  ) => {
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onEvent);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
