const { requireAuth, setCors, logError, logInfo, GROQ_API_KEY, GROQ_BASE_URL } = require('../_lib');

const AI_CHAT_SYSTEM_PROMPT = `
أنت مساعد إداري ذكي لنظام "مهمات التوصيل" اللوجستي.
لا تؤلف أي أرقام أو بيانات من عندك أبداً.
استخدم الأدوات المتاحة للإجابة على أسئلة المستخدم 
بناءً على البيانات الحقيقية من النظام.
أجب دائماً باللغة العربية بشكل دقيق ومختصر.
إذا لم تجد البيانات المطلوبة في الأدوات المتاحة، قل ذلك صراحةً.
`.trim();

const AI_CHAT_TOOLS = [
  { type: 'function', function: { name: 'get_employee_stats', description: 'إحصائيات المناديب', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_vehicle_status', description: 'حالة المركبات', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_orders_summary', description: 'ملخص الطلبات', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_month'] } }, required: [] } } },
  { type: 'function', function: { name: 'get_salary_summary', description: 'ملخص الرواتب', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_advances_summary', description: 'ملخص السلف', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_top_riders', description: 'أكثر المناديب تنفيذاً', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_bottom_riders', description: 'أضعف المناديب أداءً', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_attendance_summary', description: 'ملخص الحضور', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_month'] } }, required: [] } } },
  { type: 'function', function: { name: 'get_alerts_summary', description: 'ملخص التنبيهات', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_employee_details', description: 'تفاصيل موظف', parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'get_platform_accounts', description: 'حسابات المنصات', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_maintenance_summary', description: 'ملخص الصيانة', parameters: { type: 'object', properties: {}, required: [] } } },
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
  const t = (name || '').trim();
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, '\\$&')}%`;
}

async function executeAiTool(sb, userRole, toolName, args) {
  if (!canAccessTool(userRole, toolName)) {
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
      const by_sponsorship = {};
      for (const r of rows) { const s = r.sponsorship_status ?? 'unknown'; by_sponsorship[s] = (by_sponsorship[s] ?? 0) + 1; }
      return { total: rows.length, active_employees_count: rows.filter(r => r.status === 'active').length, by_sponsorship };
    }
    case 'get_vehicle_status': {
      const { data, error } = await sb.from('vehicles').select('status');
      if (error) throw error;
      const by_status = {};
      for (const r of (data ?? [])) { const s = r.status ?? 'unknown'; by_status[s] = (by_status[s] ?? 0) + 1; }
      return { total: (data ?? []).length, by_status };
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
      for (const r of (data ?? [])) { totalAmount += r.net_salary ?? 0; if (r.is_approved) paid++; else pending++; }
      return { month: monthYear, paid, pending, total_records: (data ?? []).length, total_amount: totalAmount };
    }
    case 'get_advances_summary': {
      const { data, error } = await sb.from('advances').select('id, amount').eq('status', 'active');
      if (error) throw error;
      return { count: (data ?? []).length, total_amount: (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0) };
    }
    case 'get_top_riders': {
      const { data, error } = await sb.from('daily_orders').select('employee_id, orders_count, employees(name)').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const totals = {};
      for (const r of (data ?? [])) {
        const id = r.employee_id; const name = r.employees?.name ?? id; const count = r.orders_count ?? 0;
        if (!totals[id]) totals[id] = { name, total: 0 };
        totals[id].total += count;
      }
      return { top_riders: Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.name, orders: r.total })) };
    }
    case 'get_bottom_riders': {
      const { data, error } = await sb.from('daily_orders').select('employee_id, orders_count, employees(name)').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const totals = {};
      for (const r of (data ?? [])) {
        const id = r.employee_id; const name = r.employees?.name ?? id; const count = r.orders_count ?? 0;
        if (!totals[id]) totals[id] = { name, total: 0 };
        totals[id].total += count;
      }
      return { bottom_riders: Object.values(totals).sort((a, b) => a.total - b.total).slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.name, orders: r.total })) };
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
      const { data, error } = await sb.from('employees').select('id, name, residency_expiry').eq('status', 'active').not('residency_expiry', 'is', null).lte('residency_expiry', monthTo);
      if (error) throw error;
      const expiring = (data ?? []).map(e => ({ name: e.name, expiry: e.residency_expiry, days_left: Math.round((new Date(e.residency_expiry).getTime() - now.getTime()) / 86400000) })).sort((a, b) => a.days_left - b.days_left);
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
      for (const r of (data ?? [])) { const name = r.apps?.name ?? 'أخرى'; by_platform[name] = (by_platform[name] ?? 0) + 1; }
      return { total_active: (data ?? []).length, by_platform };
    }
    case 'get_maintenance_summary': {
      const { data, error } = await sb.from('maintenance_logs').select('cost, status, type').gte('date', monthFrom).lte('date', monthTo);
      if (error) throw error;
      const by_status = {};
      for (const r of (data ?? [])) { const s = r.status ?? 'unknown'; by_status[s] = (by_status[s] ?? 0) + 1; }
      return { month: `${y}-${m}`, records: (data ?? []).length, total_cost: (data ?? []).reduce((s, r) => s + (r.cost ?? 0), 0), by_status };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, callerClient } = auth;

    let userRole = null;
    try { const { data: role } = await callerClient.rpc('get_my_role'); userRole = role ?? null; } catch { }

    const { messages: clientMessages } = req.body;
    if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const conversation = [
      { role: 'system', content: AI_CHAT_SYSTEM_PROMPT },
      ...clientMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    const groqChat = async (msgs, tools) => {
      const body = { model: 'llama3-70b-8192', messages: msgs, temperature: 0.3, max_tokens: 1024 };
      if (tools) { body.tools = tools; body.tool_choice = 'auto'; }
      const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify(body),
      });
      if (!groqRes.ok) { const err = await groqRes.text(); throw new Error(`Groq API error ${groqRes.status}: ${err}`); }
      return (await groqRes.json()).choices[0].message;
    };

    const responseMessage = await groqChat(conversation, AI_CHAT_TOOLS);

    if (responseMessage.tool_calls?.length > 0) {
      conversation.push(responseMessage);
      for (const toolCall of responseMessage.tool_calls) {
        let fnArgs = {};
        try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { }
        let result = {};
        try { result = await executeAiTool(callerClient, userRole, toolCall.function.name, fnArgs); }
        catch (e) { result = { error: `Tool error: ${e.message}` }; }
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
};
