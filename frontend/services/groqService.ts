/**
 * Groq AI Service — proxied through Supabase Edge Function.
 * The API key is stored server-side only (never exposed to browser).
 */
import { supabase } from '@services/supabase/client';

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
  isConfigured: (): boolean => true,

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
