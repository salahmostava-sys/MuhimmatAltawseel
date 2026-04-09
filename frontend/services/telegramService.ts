import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';

export interface SendTelegramMessageInput {
  botToken: string;
  chatId: string;
  text: string;
  disableWebPagePreview?: boolean;
}

type TelegramFunctionResponse = {
  ok?: boolean;
  error?: string;
  telegram_status?: number;
  message_id?: number | null;
};

export const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;

function requireString(value: string, message: string) {
  if (!value.trim()) {
    throw new Error(message);
  }
}

async function formatInvokeError(error: unknown): Promise<string> {
  const fallback = 'تعذر الإرسال إلى تيليجرام. حاول مرة أخرى.';
  const err = error as { message?: string; context?: Response };

  if (err.context instanceof Response) {
    try {
      const data = (await err.context.clone().json()) as { error?: string };
      if (data.error) {
        return data.error;
      }
    } catch {
      // Ignore malformed error bodies and use fallback below.
    }
  }

  if ((error as Error)?.message?.includes('Failed to fetch')) {
    return 'تعذر الاتصال بالخادم. تحقق من نشر دالة telegram-bot على Supabase.';
  }

  return fallback;
}

export function hasTelegramCredentials(config: {
  botToken?: string | null;
  adminChatId?: string | null;
} | null | undefined): boolean {
  return Boolean(config?.botToken?.trim() && config?.adminChatId?.trim());
}

export const telegramService = {
  isConfigured: hasTelegramCredentials,

  sendMessage: async (input: SendTelegramMessageInput): Promise<TelegramFunctionResponse> => {
    try {
      requireString(input.botToken, 'أدخل Bot Token أولاً.');
      requireString(input.chatId, 'أدخل Admin Chat ID أولاً.');
      requireString(input.text, 'اكتب الرسالة أولاً.');

      if (input.text.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
        throw new Error(`رسالة تيليجرام يجب ألا تتجاوز ${MAX_TELEGRAM_MESSAGE_LENGTH} حرفًا.`);
      }
    } catch (error) {
      throw toServiceError(error, 'telegramService.sendMessage');
    }

    const { data, error } = await supabase.functions.invoke<TelegramFunctionResponse>('telegram-bot', {
      body: {
        bot_token: input.botToken.trim(),
        chat_id: input.chatId.trim(),
        text: input.text,
        disable_web_page_preview: input.disableWebPagePreview ?? true,
      },
    });

    if (error) {
      const message = await formatInvokeError(error);
      throw toServiceError(new Error(message), 'telegramService.sendMessage');
    }

    if (!data?.ok) {
      throw toServiceError(
        new Error(data?.error ?? 'تعذر الإرسال إلى تيليجرام.'),
        'telegramService.sendMessage',
      );
    }

    return data;
  },
};
