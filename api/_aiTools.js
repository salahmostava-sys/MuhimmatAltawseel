'use strict';

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
  { type: 'function', function: { name: 'get_attendance_summary', description: 'ملخص الحضور والغياب', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_month'] } }, required: [] } } },
  { type: 'function', function: { name: 'get_alerts_summary', description: 'ملخص التنبيهات النشطة — إقامات منتهية', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_employee_details', description: 'تفاصيل موظف معين بالاسم', parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'get_platform_accounts', description: 'حسابات المنصات — كم حساب نشط على كل منصة', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_maintenance_summary', description: 'ملخص الصيانة — عدد طلبات الصيانة وتكاليفها', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_top_riders', description: 'أفضل 10 مناديب أداءً هذا الشهر', parameters: { type: 'object', properties: {}, required: [] } } },
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
  const t = (name || '').trim();
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, '\\$&')}%`;
}

async function queryRidersRanking(sb, monthFrom, monthTo, ascending) {
  const { data, error } = await sb.from('daily_orders')
    .select('employee_id, orders_count, employees(name)')
    .gte('date', monthFrom)
    .lte('date', monthTo);
  if (error) throw error;
  const totals = {};
  for (const r of (data ?? [])) {
    const id = r.employee_id;
    const name = r.employees?.name ?? id;
    const count = r.orders_count ?? 0;
    if (!totals[id]) totals[id] = { name, total: 0 };
    totals[id].total += count;
  }
  const sorted = Object.values(totals)
    .sort((a, b) => ascending ? a.total - b.total : b.total - a.total)
    .slice(0, 10);
  return sorted.map((r, i) => ({ rank: i + 1, name: r.name, orders: r.total }));
}

async function callGroqChat(groqApiKey, groqBaseUrl, msgs, tools) {
  const body = { model: 'llama3-70b-8192', messages: msgs, temperature: 0.3, max_tokens: 1024 };
  if (tools) { body.tools = tools; body.tool_choice = 'auto'; }
  const groqRes = await fetch(`${groqBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
    body: JSON.stringify(body),
  });
  if (!groqRes.ok) {
    const err = await groqRes.text();
    throw new Error(`Groq API error ${groqRes.status}: ${err}`);
  }
  return (await groqRes.json()).choices[0].message;
}

// ─── Individual tool handlers ─────────────────────────────────────────────────

function _buildDateCtx() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return {
    now,
    y,
    m,
    monthFrom: `${y}-${m}-01`,
    monthTo: new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0],
    today: now.toISOString().split('T')[0],
  };
}

async function _toolEmployeeStats(sb) {
  const { data, error } = await sb.from('employees').select('sponsorship_status, status');
  if (error) throw error;
  const rows = data ?? [];
  const by_sponsorship = {};
  for (const r of rows) {
    const s = r.sponsorship_status ?? 'unknown';
    by_sponsorship[s] = (by_sponsorship[s] ?? 0) + 1;
  }
  return { total: rows.length, active_employees_count: rows.filter(r => r.status === 'active').length, by_sponsorship };
}

async function _toolVehicleStatus(sb) {
  const { data, error } = await sb.from('vehicles').select('status');
  if (error) throw error;
  const by_status = {};
  for (const r of (data ?? [])) {
    const s = r.status ?? 'unknown';
    by_status[s] = (by_status[s] ?? 0) + 1;
  }
  return { total: (data ?? []).length, by_status };
}

async function _toolOrdersSummary(sb, args, ctx) {
  const period = args.period || 'today';
  const from = period === 'this_month' ? ctx.monthFrom : ctx.today;
  const to = period === 'this_month' ? ctx.monthTo : ctx.today;
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

async function _toolSalarySummary(sb, ctx) {
  const monthYear = `${ctx.y}-${ctx.m}`;
  const { data, error } = await sb.from('salary_records').select('is_approved, net_salary').eq('month_year', monthYear);
  if (error) throw error;
  let paid = 0, pending = 0, totalAmount = 0;
  for (const r of (data ?? [])) {
    totalAmount += r.net_salary ?? 0;
    if (r.is_approved) paid++; else pending++;
  }
  return { month: monthYear, paid, pending, total_records: (data ?? []).length, total_amount: totalAmount };
}

async function _toolAdvancesSummary(sb) {
  const { data, error } = await sb.from('advances').select('id, amount').eq('status', 'active');
  if (error) throw error;
  return { count: (data ?? []).length, total_amount: (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0) };
}

async function _toolAttendanceSummary(sb, args, ctx) {
  const period = args.period || 'today';
  const from = period === 'this_month' ? ctx.monthFrom : ctx.today;
  const to = period === 'this_month' ? ctx.monthTo : ctx.today;
  const { data, error } = await sb.from('attendance').select('status').gte('date', from).lte('date', to);
  if (error) throw error;
  const by_status = {};
  for (const r of (data ?? [])) {
    const s = r.status ?? 'unknown';
    by_status[s] = (by_status[s] ?? 0) + 1;
  }
  return { period: period === 'this_month' ? 'الشهر الحالي' : 'اليوم', total_records: (data ?? []).length, by_status };
}

async function _toolAlertsSummary(sb, ctx) {
  const { data, error } = await sb.from('employees')
    .select('id, name, residency_expiry')
    .eq('status', 'active')
    .not('residency_expiry', 'is', null)
    .lte('residency_expiry', ctx.monthTo);
  if (error) throw error;
  const expiring = (data ?? []).map(e => ({
    name: e.name,
    expiry: e.residency_expiry,
    days_left: Math.round((new Date(e.residency_expiry).getTime() - ctx.now.getTime()) / 86400000),
  })).sort((a, b) => a.days_left - b.days_left);
  return { expiring_residencies: expiring.length, details: expiring.slice(0, 10) };
}

async function _toolEmployeeDetails(sb, args, userRole) {
  const pattern = buildNamePattern(args.name ?? '');
  if (!pattern) return { found: false, message: 'يرجى تحديد اسم الموظف.' };
  const canViewSalary = userRole === 'admin' || userRole === 'finance';
  const fields = [
    'id', 'name', 'national_id', 'phone', 'city', 'status',
    'sponsorship_status', 'job_title', 'join_date', 'residency_expiry',
    ...(canViewSalary ? ['base_salary'] : []),
  ].join(', ');
  const { data, error } = await sb.from('employees').select(fields).ilike('name', pattern).limit(5);
  if (error) throw error;
  if (!data || data.length === 0) return { found: false, message: `لم يُعثر على موظف باسم "${args.name}"` };
  return { found: true, employees: data };
}

async function _toolPlatformAccounts(sb) {
  const { data, error } = await sb.from('platform_accounts').select('status, app_id, apps(name)').eq('status', 'active');
  if (error) throw error;
  const by_platform = {};
  for (const r of (data ?? [])) {
    const name = r.apps?.name ?? 'أخرى';
    by_platform[name] = (by_platform[name] ?? 0) + 1;
  }
  return { total_active: (data ?? []).length, by_platform };
}

async function _toolMaintenanceSummary(sb, ctx) {
  const { data, error } = await sb.from('maintenance_logs')
    .select('cost, status, type')
    .gte('date', ctx.monthFrom)
    .lte('date', ctx.monthTo);
  if (error) throw error;
  const by_status = {};
  for (const r of (data ?? [])) {
    const s = r.status ?? 'unknown';
    by_status[s] = (by_status[s] ?? 0) + 1;
  }
  return { month: `${ctx.y}-${ctx.m}`, records: (data ?? []).length, total_cost: (data ?? []).reduce((s, r) => s + (r.cost ?? 0), 0), by_status };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const _TOOL_HANDLERS = {
  get_employee_stats:    (sb, _args, _role, ctx) => _toolEmployeeStats(sb),
  get_vehicle_status:    (sb, _args, _role, ctx) => _toolVehicleStatus(sb),
  get_orders_summary:    (sb, args, _role, ctx)  => _toolOrdersSummary(sb, args, ctx),
  get_salary_summary:    (sb, _args, _role, ctx) => _toolSalarySummary(sb, ctx),
  get_advances_summary:  (sb, _args, _role, ctx) => _toolAdvancesSummary(sb),
  get_attendance_summary:(sb, args, _role, ctx)  => _toolAttendanceSummary(sb, args, ctx),
  get_alerts_summary:    (sb, _args, _role, ctx) => _toolAlertsSummary(sb, ctx),
  get_employee_details:  (sb, args, role, ctx)   => _toolEmployeeDetails(sb, args, role),
  get_platform_accounts: (sb, _args, _role, ctx) => _toolPlatformAccounts(sb),
  get_maintenance_summary:(sb, _args, _role, ctx) => _toolMaintenanceSummary(sb, ctx),
  get_top_riders:    (sb, _args, _role, ctx) => queryRidersRanking(sb, ctx.monthFrom, ctx.monthTo, false).then(r => ({ month: `${ctx.y}-${ctx.m}`, top_riders: r })),
  get_bottom_riders: (sb, _args, _role, ctx) => queryRidersRanking(sb, ctx.monthFrom, ctx.monthTo, true).then(r => ({ month: `${ctx.y}-${ctx.m}`, bottom_riders: r })),
};

async function executeAiTool(sb, userRole, toolName, args) {
  if (!canAccessTool(userRole, toolName)) {
    const isSensitive = toolName === 'get_salary_summary' || toolName === 'get_advances_summary';
    return isSensitive
      ? { error: 'عذراً، بيانات الرواتب والسلف مقصورة على المدير والمحاسب فقط.' }
      : { error: 'لا تملك صلاحية الوصول إلى هذه البيانات.' };
  }

  const handler = _TOOL_HANDLERS[toolName];
  if (!handler) return { error: `Unknown tool: ${toolName}` };

  const ctx = _buildDateCtx();
  return handler(sb, args, userRole, ctx);
}

module.exports = {
  AI_CHAT_SYSTEM_PROMPT,
  AI_CHAT_TOOLS,
  TOOL_PERMISSIONS,
  canAccessTool,
  buildNamePattern,
  queryRidersRanking,
  callGroqChat,
  executeAiTool,
};
