/**
 * خدمة المساعد الذكي — تكامل مع واجهة المحادثة.
 * المفتاح يُحمّل من متغير البيئة VITE_GROQ_API_KEY.
 */

const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY as string) || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = (import.meta.env.VITE_GROQ_MODEL as string) || 'openai/gpt-oss-120b';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  max_completion_tokens?: number;
  top_p?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  stream?: boolean;
  stop?: string[] | null;
}

export interface GroqChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    index: number;
    finish_reason?: string | null;
  }>;
  id: string;
  model: string;
  object: string;
  created: number;
}

async function* streamGroqCompletion(
  options: GroqCompletionOptions,
): AsyncGenerator<string, void, unknown> {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 1,
      max_completion_tokens: options.max_completion_tokens ?? 8192,
      top_p: options.top_p ?? 1,
      reasoning_effort: options.reasoning_effort ?? 'medium',
      stream: true,
      stop: options.stop ?? null,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body from Groq API');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk: GroqChunk = JSON.parse(trimmed.slice(6));
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function groqCompletion(
  options: GroqCompletionOptions,
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 1,
      max_completion_tokens: options.max_completion_tokens ?? 8192,
      top_p: options.top_p ?? 1,
      reasoning_effort: options.reasoning_effort ?? 'medium',
      stream: false,
      stop: options.stop ?? null,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const groqService = {
  /** Send a chat message to Groq AI (non-streaming). */
  chat: async (message: string, systemPrompt?: string): Promise<string> => {
    const messages: GroqMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    return groqCompletion({ messages });
  },

  /** Send multiple messages to Groq AI (non-streaming). */
  chatMessages: async (messages: GroqMessage[]): Promise<string> => {
    return groqCompletion({ messages });
  },

  /** Stream chat completion from Groq AI. */
  streamChat: async function* (
    messages: GroqMessage[],
    options?: Omit<GroqCompletionOptions, 'messages' | 'stream'>,
  ): AsyncGenerator<string, void, unknown> {
    yield* streamGroqCompletion({
      messages,
      ...options,
      stream: true,
    });
  },

  /** Stream a single user message to Groq AI. */
  streamChatMessage: async function* (
    message: string,
    systemPrompt?: string,
    options?: Omit<GroqCompletionOptions, 'messages' | 'stream'>,
  ): AsyncGenerator<string, void, unknown> {
    const messages: GroqMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    yield* streamGroqCompletion({
      messages,
      ...options,
      stream: true,
    });
  },

  /** Check if Groq is configured. */
  isConfigured: (): boolean => {
    return Boolean(GROQ_API_KEY);
  },

  /** Get available models from Groq. */
  listModels: async (): Promise<Array<{ id: string; name: string }>> => {
    if (!GROQ_API_KEY) {
      throw new Error('VITE_GROQ_API_KEY is not configured');
    }

    const response = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Groq API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ id: string; object: string; created: number; owned_by: string }>;
    };
    return data.data.map((m) => ({ id: m.id, name: m.id }));
  },
};
