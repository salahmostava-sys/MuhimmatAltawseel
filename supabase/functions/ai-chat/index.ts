import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
أنت مساعد إداري ذكي لنظام "مهمات التوصيل" اللوجستي.
لا تؤلف أي أرقام أو بيانات من عندك أبداً.
استخدم الأدوات المتاحة للإجابة على أسئلة المستخدم 
بناءً على البيانات الحقيقية من النظام.
أجب دائماً باللغة العربية بشكل دقيق ومختصر.
إذا لم تجد البيانات المطلوبة في الأدوات المتاحة، قل ذلك صراحةً.
`.trim();

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_employee_stats',
      description: 'إحصائيات المناديب — العدد الإجمالي وتوزيعهم حسب الحالة',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_vehicle_status',
      description: 'حالة المركبات — كم مركبة نشطة وغير معينة',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_orders_summary',
      description: 'ملخص الطلبات لليوم أو الشهر الحالي',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'this_month'],
            description: 'الفترة الزمنية',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_salary_summary',
      description: 'ملخص الرواتب للشهر الحالي',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_advances_summary',
      description: 'ملخص السلف النشطة',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ── Tool Implementations ──────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createClient>;

async function getEmployeeStats(sb: SupabaseAdmin) {
  const { data, error } = await sb.from('employees').select('sponsorship_status, status');
  if (error) throw error;
  const rows = data ?? [];
  const bySponsorship: Record<string, number> = {};
  for (const r of rows) {
    const s = (r.sponsorship_status as string) ?? 'unknown';
    bySponsorship[s] = (bySponsorship[s] ?? 0) + 1;
  }
  /** مناديب/موظفون «نشطون» حسب حقل status في النظام */
  const active_count = rows.filter((r) => (r.status as string) === 'active').length;
  return {
    total: rows.length,
    by_sponsorship: bySponsorship,
    active_employees_count: active_count,
    note:
      'active_employees_count = عدد السجلات حيث status = active. أسئلة «كم مندوب نشط» تشير عادةً إلى هذا العدد.',
  };
}

async function getVehicleStatus(sb: SupabaseAdmin) {
  const { data, error } = await sb.from('vehicles').select('status');
  if (error) throw error;
  const rows = data ?? [];
  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const s = (r.status as string) ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  return { total: rows.length, by_status: byStatus };
}

async function getOrdersSummary(sb: SupabaseAdmin, period: string = 'today') {
  const now = new Date();
  let from: string;
  let to: string;

  if (period === 'this_month') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    from = `${y}-${m}-01`;
    to = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0];
  } else {
    from = now.toISOString().split('T')[0];
    to = from;
  }

  const { data, error } = await sb
    .from('daily_orders')
    .select('orders_count, apps(name)')
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;

  const rows = data ?? [];
  let total = 0;
  const byPlatform: Record<string, number> = {};
  for (const r of rows) {
    const count = (r.orders_count as number) ?? 0;
    total += count;
    const appName = ((r.apps as { name?: string } | null)?.name) ?? 'أخرى';
    byPlatform[appName] = (byPlatform[appName] ?? 0) + count;
  }

  return {
    total,
    period: period === 'this_month' ? 'الشهر الحالي' : 'اليوم',
    date_range: `${from} → ${to}`,
    by_platform: byPlatform,
  };
}

async function getSalarySummary(sb: SupabaseAdmin) {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await sb
    .from('salary_records')
    .select('is_approved, net_salary')
    .eq('month_year', monthYear);
  if (error) throw error;

  const rows = data ?? [];
  let paid = 0;
  let pending = 0;
  let totalAmount = 0;
  for (const r of rows) {
    const net = (r.net_salary as number) ?? 0;
    totalAmount += net;
    if (r.is_approved) paid++;
    else pending++;
  }

  return { month: monthYear, paid, pending, total_records: rows.length, total_amount: totalAmount };
}

async function getAdvancesSummary(sb: SupabaseAdmin) {
  const { data, error } = await sb
    .from('advances')
    .select('id, amount')
    .eq('status', 'active');
  if (error) throw error;

  const rows = data ?? [];
  const totalAmount = rows.reduce((sum, r) => sum + ((r.amount as number) ?? 0), 0);
  return { count: rows.length, total_amount: totalAmount };
}

async function executeTool(sb: SupabaseAdmin, name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_employee_stats':
      return await getEmployeeStats(sb);
    case 'get_vehicle_status':
      return await getVehicleStatus(sb);
    case 'get_orders_summary':
      return await getOrdersSummary(sb, (args.period as string) ?? 'today');
    case 'get_salary_summary':
      return await getSalarySummary(sb);
    case 'get_advances_summary':
      return await getAdvancesSummary(sb);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── OpenAI chat completion via fetch ──────────────────────────

interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

async function openaiChat(
  messages: ChatMessage[],
  apiKey: string,
  availableTools?: typeof tools,
): Promise<ChatMessage> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      ...(availableTools ? { tools: availableTools, tool_choice: 'auto' } : {}),
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.choices[0].message;
}

// ── Main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const { messages: clientMessages } = await req.json() as { messages: ChatMessage[] };
    if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build conversation with system prompt
    const conversation: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...clientMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const responseMessage = await openaiChat(conversation, openaiKey, tools);

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      conversation.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        let result: unknown = {};
        try {
          result = await executeTool(supabaseAdmin, toolCall.function.name, fnArgs);
        } catch (e) {
          result = { error: `Tool error: ${(e as Error).message}` };
        }

        conversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      const finalResponseMessage = await openaiChat(conversation, openaiKey);
      return new Response(
        JSON.stringify({ message: finalResponseMessage.content ?? '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ message: responseMessage.content ?? '' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[ai-chat] error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
