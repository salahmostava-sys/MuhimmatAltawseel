import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'x-client-info', 'apikey'],
}));
app.use(express.json({ limit: '2mb' }));

const logInfo = (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', message: msg, ...meta, ts: new Date().toISOString() }));
const logError = (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', message: msg, ...meta, ts: new Date().toISOString() }));

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const isValidMonth = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const VALID_ROLES = new Set(['admin', 'hr', 'finance', 'operations', 'viewer']);

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
    const clientPhrases = ['Invalid month_year', 'Invalid employee_id', 'Invalid mode', 'No authorization header', 'Not authenticated', 'Method not allowed', 'Only admin/finance'];
    const isClient = clientPhrases.some(p => message.includes(p));
    const isAuthz = message.includes('Only admin/finance');
    const status = isAuthz ? 403 : isClient ? 400 : 500;
    return res.status(status).json({ error: message });
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
    const normalizedAction = action ?? (password ? 'update_password' : undefined);
    if (!normalizedAction) throw new Error('action is required');

    if (normalizedAction !== 'create_user') {
      if (!user_id) throw new Error('user_id is required');
      if (!isUuid(user_id)) throw new Error('Invalid user_id');
    }

    logInfo('Admin update user request', { request_id: requestId, admin_user_id: callerUser.id, action: normalizedAction });

    if (normalizedAction === 'create_user') {
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
          await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(e => logError('Failed to cleanup partially created user', { error: e.message }));
        }
        throw createUserFlowError;
      }

      return res.json({ success: true, user_id: createdUserId });
    }

    if (normalizedAction === 'delete_user') {
      if (user_id === callerUser.id) throw new Error('You cannot delete your own account');
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
    } else if (normalizedAction === 'revoke_session') {
      const authSchema = supabaseAdmin.schema('auth');
      const { error: refreshErr } = await authSchema.from('refresh_tokens').delete().eq('user_id', user_id);
      if (refreshErr) throw refreshErr;
      const { error: sessErr } = await authSchema.from('sessions').delete().eq('user_id', user_id);
      if (sessErr) throw sessErr;
    } else if (normalizedAction === 'update_password') {
      if (!password) throw new Error('password is required for update_password');
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
    } else {
      throw new Error('Unsupported action');
    }

    return res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('Admin update user failed', { request_id: requestId, error: message });
    const clientPhrases = ['Invalid', 'required', 'must be', 'cannot delete', 'email is required', 'password is required', 'name is required', 'action is required'];
    const isClient = clientPhrases.some(p => message.toLowerCase().includes(p.toLowerCase()));
    const isAuthError = message.includes('Only admins') || message.includes('Not authenticated');
    const status = isAuthError ? 403 : isClient ? 400 : 500;
    const safeMessage = (isClient || isAuthError) ? message : 'Internal server error';
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
// Tool definitions and implementations for the AI chat assistant
const AI_CHAT_SYSTEM_PROMPT = `
أنت مساعد إداري ذكي لنظام "مهمات التوصيل" اللوجستي.
لا تؤلف أي أرقام أو بيانات من عندك أبداً.
استخدم الأدوات المتاحة للإجابة على أسئلة المستخدم 
بناءً على البيانات الحقيقية من النظام.
أجب دائماً باللغة العربية بشكل دقيق ومختصر.
إذا لم تجد البيانات المطلوبة في الأدوات المتاحة، قل ذلك صراحةً.
`.trim();

const AI_CHAT_TOOLS = [
  { type: 'function', function: { name: 'get_employee_stats', description: 'إحصائيات المناديب — العدد الإجمالي وتوزيعهم حسب الحالة', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_vehicle_status', description: 'حالة المركبات — كم مركبة نشطة وغير معينة', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_orders_summary', description: 'ملخص الطلبات لليوم أو الشهر الحالي', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_month'] } }, required: [] } } },
  { type: 'function', function: { name: 'get_salary_summary', description: 'ملخص الرواتب للشهر الحالي', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_advances_summary', description: 'ملخص السلف النشطة', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_top_riders', description: 'أكثر المناديب تنفيذاً للطلبات هذا الشهر', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_attendance_summary', description: 'ملخص الحضور والغياب', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_month'] } }, required: [] } } },
  { type: 'function', function: { name: 'get_alerts_summary', description: 'ملخص التنبيهات النشطة — إقامات منتهية', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_employee_details', description: 'تفاصيل موظف معين بالاسم', parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'get_platform_accounts', description: 'حسابات المنصات — كم حساب نشط على كل منصة', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_maintenance_summary', description: 'ملخص الصيانة — عدد طلبات الصيانة وتكاليفها', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_top_riders', description: 'أفضل 10 مناديب هذا الشهر', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_bottom_riders', description: 'أضعف 10 مناديب أداءً هذا الشهر', parameters: { type: 'object', properties: {}, required: [] } } },
];

const TOOL_PERMISSIONS = {
  get_salary_summary: ['admin', 'finance'],
  get_advances_summary: ['admin', 'finance'],
  get_employee_details: ['admin', 'hr', 'finance'],
};

function canAccessTool(userRole, toolName) {
  const allowed = TOOL_PERMISSIONS[toolName];
  if (!allowed) return true;
  return !!userRole && allowed.includes(userRole);
}

function buildNamePattern(name) {
  const t = name.trim();
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, '\\$&')}%`;
}

async function executeAiTool(sb, userRole, toolName, args) {
  if (!canAccessTool(userRole, toolName)) {
    if (toolName === 'get_salary_summary' || toolName === 'get_advances_summary') {
      return { error: 'عذراً، بيانات الرواتب والسلف مقصورة على المدير والمحاسب فقط.' };
    }
    return { error: 'لا تملك صلاحية الوصول إلى هذه البيانات.' };
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const monthFrom = `${y}-${m}-01`;
  const monthTo = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  switch (toolName) {
    case 'get_employee_stats': {
      const { data, error } = await sb.from('employees').select('sponsorship_status, status');
      if (error) throw error;
      const rows = data ?? [];
      const active_count = rows.filter(r => r.status === 'active').length;
      const by_sponsorship = {};
      for (const r of rows) { const s = r.sponsorship_status ?? 'unknown'; by_sponsorship[s] = (by_sponsorship[s] ?? 0) + 1; }
      return { total: rows.length, active_employees_count: active_count, by_sponsorship };
    }
    case 'get_vehicle_status': {
      const { data, error } = await sb.from('vehicles').select('status');
      if (error) throw error;
      const rows = data ?? [];
      const by_status = {};
      for (const r of rows) { const s = r.status ?? 'unknown'; by_status[s] = (by_status[s] ?? 0) + 1; }
      return { total: rows.length, by_status };
    }
    case 'get_orders_summary': {
      const period = args.period || 'today';
      const from = period === 'this_month' ? monthFrom : today;
      const to = period === 'this_month' ? monthTo : today;
      const { data, error } = await sb.from('daily_orders').select('orders_count, apps(name)').gte('date', from).lte('date', to);
      if (error) throw error;
      let total = 0;
      const by_platform = {};
      for (const r of (data ?? [])) {
        const count = r.orders_count ?? 0;
        total += count;
        const appName = r.apps?.name ?? 'أخرى';
        by_platform[appName] = (by_platform[appName] ?? 0) + count;
      }
      return { total, period: period === 'this_month' ? 'الشهر الحالي' : 'اليوم', by_platform };
    }
    case 'get_salary_summary': {
      const monthYear = `${y}-${m}`;
      const { data, error } = await sb.from('salary_records').select('is_approved, net_salary').eq('month_year', monthYear);
      if (error) throw error;
      let paid = 0, pending = 0, totalAmount = 0;
      for (const r of (data ?? [])) {
        totalAmount += r.net_salary ?? 0;
        if (r.is_approved) paid++; else pending++;
      }
      return { month: monthYear, paid, pending, total_records: (data ?? []).length, total_amount: totalAmount };
    }
    case 'get_advances_summary': {
      const { data, error } = await sb.from('advances').select('id, amount').eq('status', 'active');
      if (error) throw error;
      const totalAmount = (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      return { count: (data ?? []).length, total_amount: totalAmount };
    }
    case 'get_top_riders': {
      const { data, error } = await sb.from('daily_orders').select('employee_id, orders_count, employees(name)').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const totals = {};
      for (const r of (data ?? [])) {
        const id = r.employee_id;
        const name = r.employees?.name ?? id;
        const count = r.orders_count ?? 0;
        if (!totals[id]) totals[id] = { name, total: 0 };
        totals[id].total += count;
      }
      const sorted = Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 10);
      return { month: `${y}-${m}`, top_riders: sorted.map((r, i) => ({ rank: i + 1, name: r.name, orders: r.total })) };
    }
    case 'get_bottom_riders': {
      const { data, error } = await sb.from('daily_orders').select('employee_id, orders_count, employees(name)').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const totals = {};
      for (const r of (data ?? [])) {
        const id = r.employee_id;
        const name = r.employees?.name ?? id;
        const count = r.orders_count ?? 0;
        if (!totals[id]) totals[id] = { name, total: 0 };
        totals[id].total += count;
      }
      const sorted = Object.values(totals).sort((a, b) => a.total - b.total).slice(0, 10);
      return { month: `${y}-${m}`, bottom_riders: sorted.map((r, i) => ({ rank: i + 1, name: r.name, orders: r.total })) };
    }
    case 'get_attendance_summary': {
      const period = args.period || 'today';
      const from = period === 'this_month' ? monthFrom : today;
      const to = period === 'this_month' ? monthTo : today;
      const { data, error } = await sb.from('attendance').select('status').gte('date', from).lte('date', to);
      if (error) throw error;
      const by_status = {};
      for (const r of (data ?? [])) { const s = r.status ?? 'unknown'; by_status[s] = (by_status[s] ?? 0) + 1; }
      return { period: period === 'this_month' ? 'الشهر الحالي' : 'اليوم', total_records: (data ?? []).length, by_status };
    }
    case 'get_alerts_summary': {
      const threshold = monthTo;
      const { data, error } = await sb.from('employees').select('id, name, residency_expiry').eq('status', 'active').not('residency_expiry', 'is', null).lte('residency_expiry', threshold);
      if (error) throw error;
      const expiring = (data ?? []).map(e => ({
        name: e.name,
        expiry: e.residency_expiry,
        days_left: Math.round((new Date(e.residency_expiry).getTime() - now.getTime()) / 86400000),
      })).sort((a, b) => a.days_left - b.days_left);
      return { expiring_residencies: expiring.length, details: expiring.slice(0, 10) };
    }
    case 'get_employee_details': {
      const pattern = buildNamePattern(args.name ?? '');
      if (!pattern) return { found: false, message: 'يرجى تحديد اسم الموظف.' };
      const canViewSalary = userRole === 'admin' || userRole === 'finance';
      const fields = ['id', 'name', 'national_id', 'phone', 'city', 'status', 'sponsorship_status', 'job_title', 'join_date', 'residency_expiry', ...(canViewSalary ? ['base_salary'] : [])].join(', ');
      const { data, error } = await sb.from('employees').select(fields).ilike('name', pattern).limit(5);
      if (error) throw error;
      if (!data || data.length === 0) return { found: false, message: `لم يُعثر على موظف باسم "${args.name}"` };
      return { found: true, employees: data };
    }
    case 'get_platform_accounts': {
      const { data, error } = await sb.from('platform_accounts').select('status, app_id, apps(name)').eq('status', 'active');
      if (error) throw error;
      const by_platform = {};
      for (const r of (data ?? [])) {
        const name = r.apps?.name ?? 'أخرى';
        by_platform[name] = (by_platform[name] ?? 0) + 1;
      }
      return { total_active: (data ?? []).length, by_platform };
    }
    case 'get_maintenance_summary': {
      const { data, error } = await sb.from('maintenance_logs').select('cost, status, type').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const totalCost = (data ?? []).reduce((s, r) => s + (r.cost ?? 0), 0);
      const by_status = {};
      for (const r of (data ?? [])) { const s = r.status ?? 'unknown'; by_status[s] = (by_status[s] ?? 0) + 1; }
      return { month: `${y}-${m}`, records: (data ?? []).length, total_cost: totalCost, by_status };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

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

    const groqChat = async (msgs, tools) => {
      const body = {
        model: 'llama3-70b-8192',
        messages: msgs,
        temperature: 0.3,
        max_tokens: 1024,
      };
      if (tools) { body.tools = tools; body.tool_choice = 'auto'; }

      const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify(body),
      });
      if (!groqRes.ok) {
        const err = await groqRes.text();
        throw new Error(`Groq API error ${groqRes.status}: ${err}`);
      }
      const json = await groqRes.json();
      return json.choices[0].message;
    };

    const responseMessage = await groqChat(conversation, AI_CHAT_TOOLS);

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

      const finalResponse = await groqChat(conversation);
      return res.json({ message: finalResponse.content ?? '' });
    }

    return res.json({ message: responseMessage.content ?? '' });
  } catch (e) {
    logError('[ai-chat] error', { request_id: requestId, error: e.message });
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Muhimmat API server running on port ${PORT}`);
  if (!SUPABASE_URL) console.warn('[server] WARNING: SUPABASE_URL not set');
  if (!SUPABASE_ANON_KEY) console.warn('[server] WARNING: SUPABASE_ANON_KEY not set');
  if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[server] WARNING: SUPABASE_SERVICE_ROLE_KEY not set');
  if (!GROQ_API_KEY) console.warn('[server] WARNING: GROQ_API_KEY not set — AI features disabled');
});
