import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AiChatResponse = {
  message?: string;
  error?: string;
};

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export const aiChatService = {
  sendMessage: async (messages: AiChatMessage[]): Promise<string> => {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      throw toServiceError(new Error('Not authenticated'), 'aiChatService.sendMessage');
    }

    const res = await fetch('/api/functions/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json() as AiChatResponse;

    if (!res.ok) {
      const msg = data.error ?? 'عذرًا، حدث خطأ في الاتصال. حاول مرة أخرى.';
      throw toServiceError(new Error(msg), 'aiChatService.sendMessage');
    }

    return data.message ?? data.error ?? 'لا يوجد رد';
  },
};
