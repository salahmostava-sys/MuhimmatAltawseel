import { supabase } from '@services/supabase/client';

export const realtimeService = {
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
      void supabase.removeChannel(channel);
    };
  },
};
