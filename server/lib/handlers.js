/**
 * Shared handler business logic for API routes.
 *
 * Each exported function is a plain async `(req, res) => void` handler that
 * contains **only** business logic (no CORS / method-check — the caller is
 * responsible for that).
 *
 * • `server/index.js` imports these directly (ESM).
 * • `api/functions/*.js` import via `createRequire` (CJS bridge).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  requireAuth, getAdminClient, getErrorMessage,
  isUuid, isValidMonth, VALID_ROLES, logInfo, logError,
  GROQ_API_KEY, GROQ_BASE_URL, DEFAULT_GROQ_MODEL,
  AI_CHAT_SYSTEM_PROMPT, AI_CHAT_TOOLS, executeAiTool, callGroqChat,
} = require('../../api/_lib.js');

// ─── Salary engine error classifier ──────────────────────────────────────────

function classifySalaryError(message) {
  const clientPhrases = ['Invalid month_year', 'Invalid employee_id', 'Invalid mode', 'No authorization header', 'Not authenticated', 'Method not allowed', 'Only admin/finance'];
  const isAuthz = message.includes('Only admin/finance');
  const isClient = isAuthz || clientPhrases.some(p => message.includes(p));
  if (isAuthz) return 403;
  if (isClient) return 400;
  return 500;
}

// ─── Salary Engine ────────────────────────────────────────────────────────────

export async function salaryEngineHandler(req, res) {
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
    const message = getErrorMessage(err);
    logError('Salary engine failed', { request_id: requestId, error: message });
    return res.status(classifySalaryError(message)).json({ error: message });
  }
}

// ─── Admin Update User ────────────────────────────────────────────────────────

async function handleCreateUser(supabaseAdmin, { email, password, name, role }) {
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
      email: normalizedEmail, password, email_confirm: true,
      user_metadata: { name: normalizedName },
    });
    if (createError) throw createError;
    createdUserId = createdUser.user?.id ?? null;
    if (!createdUserId) throw new Error('User creation returned no user id');

    const { error: profileError } = await supabaseAdmin.from('profiles')
      .update({ email: normalizedEmail, name: normalizedName, is_active: true })
      .eq('id', createdUserId);
    if (profileError) throw profileError;

    await supabaseAdmin.from('user_roles').delete().eq('user_id', createdUserId);
    const { error: insertRoleError } = await supabaseAdmin.from('user_roles')
      .insert({ user_id: createdUserId, role: normalizedRole });
    if (insertRoleError) throw insertRoleError;
  } catch (err) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
        .catch(e => logError('Failed to cleanup partially created user', { error: e.message }));
    }
    throw err;
  }
  return { success: true, user_id: createdUserId };
}

async function handleDeleteUser(supabaseAdmin, user_id, callerId) {
  if (user_id === callerId) throw new Error('You cannot delete your own account');
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (error) throw error;
  return { success: true };
}

async function handleRevokeSession(supabaseAdmin, user_id) {
  const authSchema = supabaseAdmin.schema('auth');
  const { error: refreshErr } = await authSchema.from('refresh_tokens').delete().eq('user_id', user_id);
  if (refreshErr) throw refreshErr;
  const { error: sessErr } = await authSchema.from('sessions').delete().eq('user_id', user_id);
  if (sessErr) throw sessErr;
  return { success: true };
}

async function handleUpdatePassword(supabaseAdmin, user_id, password) {
  if (!password) throw new Error('password is required for update_password');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
  if (error) throw error;
  return { success: true };
}

async function dispatchAction(supabaseAdmin, normalizedAction, { user_id, password, email, name, role }, callerId) {
  if (normalizedAction === 'create_user') return handleCreateUser(supabaseAdmin, { email, password, name, role });
  if (normalizedAction === 'delete_user') return handleDeleteUser(supabaseAdmin, user_id, callerId);
  if (normalizedAction === 'revoke_session') return handleRevokeSession(supabaseAdmin, user_id);
  if (normalizedAction === 'update_password') return handleUpdatePassword(supabaseAdmin, user_id, password);
  throw new Error('Unsupported action');
}

function classifyAdminError(message) {
  const clientPhrases = ['Invalid', 'required', 'must be', 'cannot delete', 'email is required', 'password is required', 'name is required', 'action is required'];
  const isClient = clientPhrases.some(p => message.toLowerCase().includes(p.toLowerCase()));
  const isAuthError = message.includes('Only admins') || message.includes('Not authenticated');
  if (isAuthError) return { status: 403, safeMessage: message };
  if (isClient) return { status: 400, safeMessage: message };
  return { status: 500, safeMessage: 'Internal server error' };
}

export async function adminUpdateUserHandler(req, res) {
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

    const result = await dispatchAction(supabaseAdmin, normalizedAction, { user_id, password, email, name, role }, callerUser.id);
    return res.json(result);
  } catch (err) {
    const message = getErrorMessage(err);
    logError('Admin update user failed', { request_id: requestId, error: message });
    const { status, safeMessage } = classifyAdminError(message);
    return res.status(status).json({ error: safeMessage });
  }
}

// ─── Groq Chat ────────────────────────────────────────────────────────────────

export async function groqChatHandler(req, res) {
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
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
    const message = getErrorMessage(err);
    logError('groq-chat unhandled error', { request_id: requestId, error: message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export async function aiChatHandler(req, res) {
  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { callerClient } = auth;

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
    const message = e instanceof Error ? e.message : String(e);
    logError('[ai-chat] error', { request_id: requestId, error: message });
    return res.status(500).json({ error: message || 'Internal server error' });
  }
}
