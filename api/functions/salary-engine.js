const { requireAuth, getAdminClient, setCors, isUuid, isValidMonth, logInfo, logError } = require('../_lib');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = crypto.randomUUID();
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, callerClient } = auth;

    const { data: roleRows, error: roleError } = await callerClient
      .from('user_roles').select('role').eq('user_id', user.id);
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
    const clientPhrases = ['Invalid month_year', 'Invalid employee_id', 'Invalid mode', 'No authorization header', 'Not authenticated', 'Only admin/finance'];
    const isClient = clientPhrases.some(p => message.includes(p));
    const isAuthz = message.includes('Only admin/finance');
    const status = isAuthz ? 403 : isClient ? 400 : 500;
    return res.status(status).json({ error: message });
  }
};
