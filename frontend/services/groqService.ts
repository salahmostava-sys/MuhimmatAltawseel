/**
 * Groq AI Service — proxied through the Replit Express server.
 * The API key is stored server-side only (never exposed to browser).
 */
import { supabase } from '@services/supabase/client';

let _configured: boolean | null = null;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

async function callGroqServer(messages: GroqMessage[]): Promise<string> {
  const authHeader = await getAuthHeader();
  if (!authHeader) throw new Error('Not authenticated');

  const res = await fetch('/api/functions/groq-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json() as { message?: string; error?: string };

  if (!res.ok || data.error) {
    throw new Error(data.error ?? 'groq-chat server error');
  }

  return data.message ?? '';
}

export const groqService = {
  isConfigured: (): boolean => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    return Boolean(url && url.startsWith('https'));
  },

  checkConfiguration: async (): Promise<boolean> => {
    if (_configured !== null) return _configured;
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) { _configured = false; return false; }
      const res = await fetch('/api/functions/groq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
      });
      _configured = res.ok;
    } catch {
      _configured = false;
    }
    return _configured;
  },

  chat: (message: string, systemPrompt?: string): Promise<string> => {
    const messages: GroqMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });
    return callGroqServer(messages);
  },

  chatMessages: (messages: GroqMessage[]): Promise<string> => {
    return callGroqServer(messages);
  },

  streamChat: async function* (messages: GroqMessage[]): AsyncGenerator<string, void, unknown> {
    const result = await callGroqServer(messages);
    yield result;
  },

  streamChatMessage: async function* (message: string, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    const messages: GroqMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });
    const result = await callGroqServer(messages);
    yield result;
  },
};
