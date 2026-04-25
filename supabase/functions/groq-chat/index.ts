/**
 * groq-chat Edge Function
 *
 * Security model (mirrors salary-engine):
 * - Requires a valid Supabase JWT (Authorization: Bearer <token>)
 * - Verifies the caller is an authenticated user (any role)
 * - Rate-limited per user: 20 requests / 60 seconds via enforce_rate_limit RPC
 * - GROQ_API_KEY is never exposed to the browser
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama3-8b-8192';

const jsonResponse = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });

const logInfo = (message: string, meta: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level: 'info', message, ...meta, ts: new Date().toISOString() }));
};

const logError = (message: string, meta: Record<string, unknown> = {}) => {
  console.error(JSON.stringify({ level: 'error', message, ...meta, ts: new Date().toISOString() }));
};

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(requestOrigin);
  }

  const requestId = crypto.randomUUID();

  try {
    // ── 1. Method guard ──────────────────────────────────────────────────────
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, requestOrigin);
    }

    // ── 2. Server-side API key check ─────────────────────────────────────────
    if (!GROQ_API_KEY) {
      logError('GROQ_API_KEY not configured', { request_id: requestId });
      return jsonResponse({ error: 'AI service is not configured on the server' }, 500, requestOrigin);
    }

    // ── 3. Auth: require valid Supabase JWT ──────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401, requestOrigin);
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) {
      return jsonResponse({ error: 'Not authenticated' }, 401, requestOrigin);
    }

    // ── 4. Rate limiting: 20 requests per user per 60 seconds ────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const rateLimitKey = `groq-chat:${callerUser.id}`;
    const { data: rateLimitRows, error: rateLimitError } = await adminClient.rpc('enforce_rate_limit', {
      p_key: rateLimitKey,
      p_limit: 20,
      p_window_seconds: 60,
    } as Record<string, unknown>);

    if (rateLimitError) {
      logError('Rate limit RPC failed', { request_id: requestId, error: rateLimitError.message });
      // Fail open on rate-limit RPC error to avoid blocking legitimate users
    } else {
      const rate = Array.isArray(rateLimitRows)
        ? (rateLimitRows[0] as { allowed?: boolean; remaining?: number } | undefined)
        : undefined;

      if (rate && !rate.allowed) {
        logError('Rate limit exceeded', { request_id: requestId, user_id: callerUser.id });
        return jsonResponse({ error: 'Too many requests. Please retry shortly.' }, 429, requestOrigin);
      }
    }

    // ── 5. Parse and validate request body ───────────────────────────────────
    let body: { messages?: unknown; model?: unknown; temperature?: unknown; max_tokens?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, requestOrigin);
    }

    const { messages, model, temperature, max_tokens } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages must be a non-empty array' }, 400, requestOrigin);
    }

    // ── 6. Call Groq API ──────────────────────────────────────────────────────
    logInfo('groq-chat request accepted', {
      request_id: requestId,
      user_id: callerUser.id,
      message_count: messages.length,
    });

    const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: typeof model === 'string' ? model : DEFAULT_MODEL,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1024,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      logError('Groq API error', { request_id: requestId, status: groqResponse.status, body: errText });
      return jsonResponse({ error: `AI service error (${groqResponse.status})` }, 502, requestOrigin);
    }

    const data = await groqResponse.json();
    const message = data.choices?.[0]?.message?.content ?? '';

    return jsonResponse({ message }, 200, requestOrigin);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logError('groq-chat unhandled error', { request_id: requestId, error: errMsg });
    return jsonResponse({ error: 'Internal server error' }, 500, requestOrigin);
  }
});
