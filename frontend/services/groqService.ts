/**
 * Groq AI Service — proxied through Supabase Edge Function.
 * The API key is stored server-side only (never exposed to browser).
 */
import { supabase } from '@services/supabase/client';

/** Cached result of {@link groqService.checkConfiguration}. */
let _configured: boolean | null = null;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callGroqEdgeFunction(messages: GroqMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ message?: string; error?: string }>('groq-chat', {
    body: { messages },
  });

  if (error) {
    throw new Error(error.message ?? 'groq-chat edge function error');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.message ?? '';
}

export const groqService = {
  /**
   * Checks whether the Groq chat service is likely reachable.
   * Relies on the Supabase client being configured with a valid URL.
   * For a definitive answer, call {@link checkConfiguration}.
   */
  isConfigured: (): boolean => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    return Boolean(url && url.startsWith('https'));
  },

  /**
   * Performs a lightweight probe to confirm the groq-chat edge function
   * is deployed and reachable. Result is cached for the session.
   */
  checkConfiguration: async (): Promise<boolean> => {
    if (_configured !== null) return _configured;
    try {
      const { error } = await supabase.functions.invoke('groq-chat', {
        body: { messages: [{ role: 'user', content: 'ping' }] },
      });
      _configured = !error;
    } catch {
      _configured = false;
    }
    return _configured;
  },

  chat: async (message: string, systemPrompt?: string): Promise<string> => {
    const messages: GroqMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });
    return callGroqEdgeFunction(messages);
  },

  chatMessages: async (messages: GroqMessage[]): Promise<string> => {
    return callGroqEdgeFunction(messages);
  },

  streamChat: async function* (messages: GroqMessage[]): AsyncGenerator<string, void, unknown> {
    const result = await callGroqEdgeFunction(messages);
    yield result;
  },

  streamChatMessage: async function* (message: string, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    const messages: GroqMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });
    const result = await callGroqEdgeFunction(messages);
    yield result;
  },
};
