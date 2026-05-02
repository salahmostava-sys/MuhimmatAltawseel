const { requireAuth, getAdminClient, ensurePostRequest, getErrorMessage, isUuid, VALID_ROLES, logInfo, logError } = require('../_lib');

// ─── Action handlers ──────────────────────────────────────────────────────────

async function _handleCreateUser(supabaseAdmin, { email, password, name, role }) {
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

async function _handleDeleteUser(supabaseAdmin, user_id, callerId) {
  if (user_id === callerId) throw new Error('You cannot delete your own account');
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (error) throw error;
  return { success: true };
}

async function _handleRevokeSession(supabaseAdmin, user_id) {
  const authSchema = supabaseAdmin.schema('auth');
  const { error: refreshErr } = await authSchema.from('refresh_tokens').delete().eq('user_id', user_id);
  if (refreshErr) throw refreshErr;
  const { error: sessErr } = await authSchema.from('sessions').delete().eq('user_id', user_id);
  if (sessErr) throw sessErr;
  return { success: true };
}

async function _handleUpdatePassword(supabaseAdmin, user_id, password) {
  if (!password) throw new Error('password is required for update_password');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
  if (error) throw error;
  return { success: true };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (!ensurePostRequest(req, res)) return;

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

    let result;
    if (normalizedAction === 'create_user') {
      result = await _handleCreateUser(supabaseAdmin, { email, password, name, role });
    } else if (normalizedAction === 'delete_user') {
      result = await _handleDeleteUser(supabaseAdmin, user_id, callerUser.id);
    } else if (normalizedAction === 'revoke_session') {
      result = await _handleRevokeSession(supabaseAdmin, user_id);
    } else if (normalizedAction === 'update_password') {
      result = await _handleUpdatePassword(supabaseAdmin, user_id, password);
    } else {
      throw new Error('Unsupported action');
    }

    return res.json(result);
  } catch (err) {
    const message = getErrorMessage(err);
    logError('Admin update user failed', { request_id: requestId, error: message });
    const clientPhrases = ['Invalid', 'required', 'must be', 'cannot delete', 'email is required', 'password is required', 'name is required', 'action is required'];
    const isClient = clientPhrases.some(p => message.toLowerCase().includes(p.toLowerCase()));
    const isAuthError = message.includes('Only admins') || message.includes('Not authenticated');
    let status = 500;
    if (isAuthError) status = 403;
    else if (isClient) status = 400;
    const safeMessage = (isClient || isAuthError) ? message : 'Internal server error';
    return res.status(status).json({ error: safeMessage });
  }
};
