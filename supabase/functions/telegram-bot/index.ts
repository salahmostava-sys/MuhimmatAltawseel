import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = new Set(['admin', 'hr', 'finance', 'operations']);
const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;

type TelegramRequest = {
  bot_token?: string;
  chat_id?: string;
  text?: string;
  disable_web_page_preview?: boolean;
};

const logInfo = (message: string, meta: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level: 'info', message, ...meta, ts: new Date().toISOString() }));
};

const logError = (message: string, meta: Record<string, unknown> = {}) => {
  console.error(JSON.stringify({ level: 'error', message, ...meta, ts: new Date().toISOString() }));
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user: callerUser },
    } = await callerClient.auth.getUser();
    if (!callerUser) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const { data: roleRows, error: roleError } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);
    if (roleError) throw roleError;

    const roles = new Set((roleRows ?? []).map((row: { role: string }) => row.role));
    if (![...roles].some((role) => ALLOWED_ROLES.has(role))) {
      return json({ error: 'Only authorized roles can send Telegram messages' }, 403);
    }

    const payload = (await req.json()) as TelegramRequest;
    const botToken = payload.bot_token?.trim() ?? '';
    const chatId = payload.chat_id?.trim() ?? '';
    const text = payload.text?.trim() ?? '';

    if (!botToken) throw new Error('Bot token is required');
    if (!chatId) throw new Error('Chat ID is required');
    if (!text) throw new Error('Message text is required');
    if (text.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds ${MAX_TELEGRAM_MESSAGE_LENGTH} characters`);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const rateLimitKey = `telegram-bot:${callerUser.id}`;
    const { data: rateLimitRows, error: rateLimitError } = await adminClient.rpc('enforce_rate_limit', {
      p_key: rateLimitKey,
      p_limit: 20,
      p_window_seconds: 60,
    } as Record<string, unknown>);
    if (rateLimitError) throw rateLimitError;

    const rate = Array.isArray(rateLimitRows)
      ? (rateLimitRows[0] as { allowed?: boolean; remaining?: number } | undefined)
      : undefined;

    if (!rate?.allowed) {
      logError('Telegram rate limit exceeded', {
        request_id: requestId,
        user_id: callerUser.id,
      });
      return json({ error: 'Too many Telegram requests. Please retry shortly.' }, 429);
    }

    logInfo('Telegram send accepted', {
      request_id: requestId,
      user_id: callerUser.id,
      remaining: rate.remaining ?? null,
    });

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: payload.disable_web_page_preview ?? true,
        }),
      },
    );

    const telegramJson = await telegramResponse.json().catch(() => null) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    } | null;

    if (!telegramResponse.ok || telegramJson?.ok === false) {
      const description = telegramJson?.description ?? `Telegram API error ${telegramResponse.status}`;
      logError('Telegram send failed', {
        request_id: requestId,
        user_id: callerUser.id,
        status: telegramResponse.status,
        error: description,
      });
      return json(
        {
          ok: false,
          error: description,
          telegram_status: telegramResponse.status,
        },
        400,
      );
    }

    return json({
      ok: true,
      telegram_status: telegramResponse.status,
      message_id: telegramJson?.result?.message_id ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('Telegram send request failed', {
      request_id: requestId,
      error: message,
    });
    return json({ error: message }, 400);
  }
});
