import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@services/supabase/client';

import { telegramService } from './telegramService';

describe('telegramService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the telegram edge function with normalized payload', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, message_id: 123 },
      error: null,
    });

    await telegramService.sendMessage({
      botToken: ' bot-token ',
      chatId: ' chat-42 ',
      text: 'رسالة تجريبية',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('telegram-bot', {
      body: {
        bot_token: 'bot-token',
        chat_id: 'chat-42',
        text: 'رسالة تجريبية',
        disable_web_page_preview: true,
      },
    });
  });

  it('throws a clear validation error when chat id is missing', async () => {
    await expect(
      telegramService.sendMessage({
        botToken: 'token',
        chatId: '   ',
        text: 'رسالة',
      }),
    ).rejects.toThrow('Admin Chat ID');
  });
});
