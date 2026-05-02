import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { isUuid, isValidMonth, VALID_ROLES } from './lib/validation.js';
import { AI_CHAT_SYSTEM_PROMPT, AI_CHAT_TOOLS, executeAiTool, callGroqChat } from './lib/aiTools.js';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

// Allowed CORS origins — comma-separated list via env var
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no Origin header) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not in ALLOWED_ORIGINS`));
  },
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'x-client-info', 'apikey'],
}));
app.use(express.json({ limit: '2mb' }));

const LOG_META_ALLOWLIST = new Set([
  'request_id',
  'user_id',
  'admin_user_id',
  'action',
  'mode',
  'month_year',
  'message_count',
  'status',
  'error',
]);

function safeLogMeta(meta = {}) {
  return Object.fromEntries(
    Object.entries(meta)
      .filter(([key]) => LOG_META_ALLOWLIST.has(key))
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 120) : value]),
  );
}

const logInfo = (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', message: msg, ...safeLogMeta(meta), ts: new Date().toISOString() }));
const logError = (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', message: msg, ...safeLogMeta(meta), ts: new Date().toISOString() }));

function getCallerClient(authHeader) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function requireAuth(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return null;
  }
  const callerClient = getCallerClient(authHeader);
  const { data: { user }, error } = await callerClient.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return { user, callerClient };
}

// ─── Salary engine error classifier ──────────────────────────────────────────

function _classifySalaryError(message) {
  const clientPhrases = ['Invalid month_year', 'Invalid employee_id', 'Invalid mode', 'No authorization header', 'Not authenticated', 'Method not allowed', 'Only admin/finance'];
  const isAuthz = message.includes('Only admin/finance');
  const isClient = isAuthz || clientPhrases.some(p => message.includes(p));
  if (isAuthz) return 403;
  if (isClient) return 400;
  return 500;
}

// ─── Admin-update-user dispatcher + error classifier ─────────────────────────

async function _srvDispatchAction(supabaseAdmin, normalizedAction, { user_id, password, email, name, role }, callerId) {
  if (normalizedAction === 'create_user') return _srvHandleCreateUser(supabaseAdmin, { email, password, name, role }, logError);
  if (normalizedAction === 'delete_user') return _srvHandleDeleteUser(supabaseAdmin, user_id, callerId);
  if (normalizedAction === 'revoke_session') return _srvHandleRevokeSession(supabaseAdmin, user_id);
  if (normalizedAction === 'update_password') return _srvHandleUpdatePassword(supabaseAdmin, user_id, password);
  throw new Error('Unsupported action');
}

function _srvClassifyAdminError(message) {
  const clientPhrases = ['Invalid', 'required', 'must be', 'cannot delete', 'email is required', 'password is required', 'name is required', 'action is required'];
  const isClient = clientPhrases.some(p => message.toLowerCase().includes(p.toLowerCase()));
  const isAuthError = message.includes('Only admins') || message.includes('Not authenticated');
  if (isAuthError) return { status: 403, safeMessage: message };
  if (isClient) return { status: 400, safeMessage: message };
  return { status: 500, safeMessage: 'Internal server error' };
}

// ─── Admin-update-user handler helpers ───────────────────────────────────────

async function _srvHandleCreateUser(supabaseAdmin, { email, password, name, role }, logErr) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const normalizedName = String(name ?? '').trim();
  const normalizedRole = String(role ?? 'viewer').trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Invalid email');
  if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
  if (!normalizedName) throw new Error('name is required');
  if (!VALID_ROLES.has(normalizedRole)) throw new Error('Invalid role');

  let createdUserId = null;
  try {
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: normalizedName },
    });
    if (createError) throw createError;
    createdUserId = createdUser.user?.id ?? null;
    if (!createdUserId) throw new Error('User creation returned no user id');

    const { error: profileError } = await supabaseAdmin.from('profiles').update({ email: normalizedEmail, name: normalizedName, is_active: true }).eq('id', createdUserId);
    if (profileError) throw profileError;

    await supabaseAdmin.from('user_roles').delete().eq('user_id', createdUserId);
    const { error: insertRoleError } = await supabaseAdmin.from('user_roles').insert({ user_id: createdUserId, role: normalizedRole });
    if (insertRoleError) throw insertRoleError;
  } catch (createUserFlowError) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(e => logErr('Failed to cleanup partially created user', { error: e.message }));
    }
    throw createUserFlowError;
  }
  return { success: true, user_id: createdUserId };
}

async function _srvHandleDeleteUser(supabaseAdmin, user_id, callerId) {
  if (user_id === callerId) throw new Error('You cannot delete your own account');
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (error) throw error;
}

async function _srvHandleRevokeSession(supabaseAdmin, user_id) {
  const authSchema = supabaseAdmin.schema('auth');
  const { error: refreshErr } = await authSchema.from('refresh_tokens').delete().eq('user_id', user_id);
  if (refreshErr) throw refreshErr;
  const { error: sessErr } = await authSchema.from('sessions').delete().eq('user_id', user_id);
  if (sessErr) throw sessErr;
}

async function _srvHandleUpdatePassword(supabaseAdmin, user_id, password) {
  if (!password) throw new Error('password is required for update_password');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
  if (error) throw error;
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Salary Engine (replaces salary-engine edge function) ─────────────────────
app.post('/api/functions/salary-engine', async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, callerClient } = auth;

    const { data: roleRows, error: roleError } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    if (roleError) throw new Error(roleError.message);

    const roles = new Set((roleRows || []).map(r => r.role));
    if (!roles.has('admin') && !roles.has('finance')) {
      return res.status(403).json({ error: 'Only admin/finance can run salary engine' });
    }

    const payload = req.body;
    if (!payload?.month_year || !isValidMonth(payload.month_year)) {
      return res.status(400).json({ error: 'Invalid month_year format. Expected YYYY-MM' });
    }

    const adminClient = getAdminClient();
    const mode = payload.mode;

    logInfo('Salary engine request accepted', { request_id: requestId, user_id: user.id, mode, month_year: payload.month_year });

    if (mode === 'employee') {
      if (!isUuid(payload.employee_id)) return res.status(400).json({ error: 'Invalid employee_id' });

      const { data, error } = await adminClient.rpc('calculate_salary_for_employee_month', {
        p_employee_id: payload.employee_id,
        p_month_year: payload.month_year,
        p_payment_method: payload.payment_method || 'cash',
        p_manual_deduction: Number(payload.manual_deduction || 0),
        p_manual_deduction_note: payload.manual_deduction_note ?? null,
      });
      if (error) throw new Error(error.message);
      return res.json({ data });
    }

    if (mode === 'month') {
      const { data, error } = await adminClient.rpc('calculate_salary_for_month', {
        p_month_year: payload.month_year,
        p_payment_method: payload.payment_method || 'cash',
      });
      if (error) throw new Error(error.message);
      return res.json({ data });
    }

    if (mode === 'month_preview') {
      const { data, error } = await adminClient.rpc('preview_salary_for_month', {
        p_month_year: payload.month_year,
      });
      if (error) throw new Error(error.message);
      return res.json({ data });
    }

    return res.status(400).json({ error: 'Invalid mode. Use "employee", "month", or "month_preview"' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('Salary engine failed', { request_id: requestId, error: message });
    return res.status(_classifySalaryError(message)).json({ error: message });
  }
});

// ── Admin Update User (replaces admin-update-user edge function) ──────────────
app.post('/api/functions/admin-update-user', async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user: callerUser, callerClient } = auth;

    const { data: roleData } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update users' });
    }

    const supabaseAdmin = getAdminClient();
    const { user_id, password, email, name, role, action } = req.body;
    let normalizedAction = action;
    if (!normalizedAction && password) normalizedAction = 'update_password';
    if (!normalizedAction) throw new Error('action is required');

    if (normalizedAction !== 'create_user') {
      if (!user_id) throw new Error('user_id is required');
      if (!isUuid(user_id)) throw new Error('Invalid user_id');
    }

    logInfo('Admin update user request', { request_id: requestId, admin_user_id: callerUser.id, action: normalizedAction });

    const result = await _srvDispatchAction(supabaseAdmin, normalizedAction, { user_id, password, email, name, role }, callerUser.id);
    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('Admin update user failed', { request_id: requestId, error: message });
    const { status, safeMessage } = _srvClassifyAdminError(message);
    return res.status(status).json({ error: safeMessage });
  }
});

// ── Groq Chat (replaces groq-chat edge function) ──────────────────────────────
app.post('/api/functions/groq-chat', async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) {
      logError('GROQ_API_KEY not configured', { request_id: requestId });
      return res.status(500).json({ error: 'AI service is not configured on the server' });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user: callerUser } = auth;

    const { messages, model, temperature, max_tokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    logInfo('groq-chat request accepted', { request_id: requestId, user_id: callerUser.id, message_count: messages.length });

    const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: typeof model === 'string' ? model : DEFAULT_GROQ_MODEL,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1024,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      logError('Groq API error', { request_id: requestId, status: groqResponse.status, body: errText });
      return res.status(502).json({ error: `AI service error (${groqResponse.status})` });
    }

    const data = await groqResponse.json();
    const message = data.choices?.[0]?.message?.content ?? '';
    return res.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('groq-chat unhandled error', { request_id: requestId, error: message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── AI Chat (replaces ai-chat edge function) ──────────────────────────────────

app.post('/api/functions/ai-chat', async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, callerClient } = auth;

    let userRole = null;
    try {
      const { data: role } = await callerClient.rpc('get_my_role');
      userRole = role ?? null;
    } catch { /* non-blocking */ }

    const { messages: clientMessages } = req.body;
    if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const conversation = [
      { role: 'system', content: AI_CHAT_SYSTEM_PROMPT },
      ...clientMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    const responseMessage = await callGroqChat(GROQ_API_KEY, GROQ_BASE_URL, conversation, AI_CHAT_TOOLS);

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      conversation.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        let fnArgs = {};
        try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { fnArgs = {}; }

        let result = {};
        try {
          result = await executeAiTool(callerClient, userRole, toolCall.function.name, fnArgs);
        } catch (e) {
          result = { error: `Tool error: ${e.message}` };
        }

        conversation.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }

      const finalResponse = await callGroqChat(GROQ_API_KEY, GROQ_BASE_URL, conversation);
      return res.json({ message: finalResponse.content ?? '' });
    }

    return res.json({ message: responseMessage.content ?? '' });
  } catch (e) {
    logError('[ai-chat] error', { request_id: requestId, error: e.message });
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Startup checks ────────────────────────────────────────────────────────────
if (IS_PRODUCTION && !AI_INTERNAL_KEY) {
  console.error('[server] FATAL: AI_INTERNAL_KEY must be set in production.');
  console.error('[server] Generate one with: openssl rand -hex 32');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Muhimmat API server running on port ${PORT}`);
  console.log(`[server] CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  if (!SUPABASE_URL) console.warn('[server] WARNING: SUPABASE_URL not set');
  if (!SUPABASE_ANON_KEY) console.warn('[server] WARNING: SUPABASE_ANON_KEY not set');
  if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[server] WARNING: SUPABASE_SERVICE_ROLE_KEY not set');
  if (!GROQ_API_KEY) console.warn('[server] WARNING: GROQ_API_KEY not set — AI features disabled');
  if (!AI_INTERNAL_KEY) console.warn('[server] WARNING: AI_INTERNAL_KEY not set — set in production via env');
});
