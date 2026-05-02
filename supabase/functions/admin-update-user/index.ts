import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const VALID_ROLES = new Set(['admin', 'hr', 'finance', 'operations', 'viewer']);

const isValidRole = (value: string): value is 'admin' | 'hr' | 'finance' | 'operations' | 'viewer' =>
  VALID_ROLES.has(value);

const logInfo = (message: string, meta: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level: 'info', message, ...meta, ts: new Date().toISOString() }));
};

const logError = (message: string, meta: Record<string, unknown> = {}) => {
  console.error(JSON.stringify({ level: 'error', message, ...meta, ts: new Date().toISOString() }));
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  const requestOrigin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(requestOrigin);
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseAnonKey) throw new Error('SUPABASE_ANON_KEY is required');

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callerUser } } = await supabaseClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check caller is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can update users' }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Use service role to update user
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const {
      user_id,
      password,
      email,
      name,
      role,
      action,
    } = await req.json() as {
      user_id?: string;
      password?: string;
      email?: string;
      name?: string;
      role?: string;
      action?: 'update_password' | 'revoke_session' | 'create_user' | 'delete_user';
    };
    const normalizedAction = action ?? (password ? 'update_password' : undefined);
    if (!normalizedAction) throw new Error('action is required');

    if (normalizedAction !== 'create_user') {
      if (!user_id) throw new Error('user_id is required');
      if (!isUuid(user_id)) throw new Error('Invalid user_id');
    }

    const rateKey = `admin-update-user:${callerUser.id}`;
    const { data: rateRows, error: rateError } = await supabaseAdmin.rpc('enforce_rate_limit', {
      p_key: rateKey,
      p_limit: 10,
      p_window_seconds: 60,
    } as Record<string, unknown>);
    if (rateError) throw rateError;

    const rate = Array.isArray(rateRows)
      ? (rateRows[0] as { allowed?: boolean; remaining?: number } | undefined)
      : undefined;

    if (!rate?.allowed) {
      logError('Rate limit exceeded', {
        request_id: requestId,
        admin_user_id: callerUser.id,
        target_user_id: user_id,
      });
      return new Response(JSON.stringify({ error: 'Too many requests. Please retry shortly.' }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    logInfo('Admin update user request accepted', {
      request_id: requestId,
      admin_user_id: callerUser.id,
      target_user_id: user_id,
      remaining: rate.remaining ?? null,
    });

    if (normalizedAction === 'create_user') {
      const normalizedEmail = String(email ?? '').trim().toLowerCase();
      const normalizedName = String(name ?? '').trim();
      const normalizedRole = String(role ?? 'viewer').trim();

      if (!normalizedEmail) throw new Error('email is required');
      if (!normalizedEmail.includes('@')) throw new Error('Invalid email');
      if (!password) throw new Error('password is required for create_user');
      if (String(password).length < 8) throw new Error('Password must be at least 8 characters');
      if (!normalizedName) throw new Error('name is required');
      if (!isValidRole(normalizedRole)) throw new Error('Invalid role');

      let createdUserId: string | null = null;
      try {
        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: normalizedName,
          },
        });
        if (createError) throw createError;

        createdUserId = createdUser.user?.id ?? null;
        if (!createdUserId) throw new Error('User creation returned no user id');

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            email: normalizedEmail,
            name: normalizedName,
            is_active: true,
          })
          .eq('id', createdUserId);
        if (profileError) throw profileError;

        const { error: clearRolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', createdUserId);
        if (clearRolesError) throw clearRolesError;

        const { error: insertRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: createdUserId,
            role: normalizedRole,
          });
        if (insertRoleError) throw insertRoleError;
      } catch (createUserFlowError) {
        if (createdUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch((cleanupError) => {
            logError('Failed to cleanup partially created user', {
              request_id: requestId,
              target_user_id: createdUserId,
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            });
          });
        }
        throw createUserFlowError;
      }

      return new Response(JSON.stringify({ success: true, user_id: createdUserId }), {
        headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (normalizedAction === 'delete_user') {
      if (user_id === callerUser.id) {
        throw new Error('You cannot delete your own account');
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
    } else if (normalizedAction === 'revoke_session') {
      // Revoke all refresh tokens/sessions for target user.
      const authSchema = supabaseAdmin.schema('auth');
      const { error: refreshTokensError } = await authSchema
        .from('refresh_tokens')
        .delete()
        .eq('user_id', user_id);
      if (refreshTokensError) throw refreshTokensError;

      const { error: sessionsError } = await authSchema
        .from('sessions')
        .delete()
        .eq('user_id', user_id);
      if (sessionsError) throw sessionsError;
    } else if (normalizedAction === 'update_password') {
      if (!password) throw new Error('password is required for update_password');
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
    } else {
      throw new Error('Unsupported action');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    logError('Admin update user request failed', {
      request_id: requestId,
      error: rawMessage,
    });

    // Distinguish client errors (bad input) from internal server failures.
    // Never leak internal DB/auth error details to the caller.
    const clientPhrases = [
      'Invalid', 'required', 'must be', 'cannot delete',
      'email is required', 'password is required',
      'name is required', 'action is required',
    ];
    const isClientError = clientPhrases.some((p) => rawMessage.toLowerCase().includes(p.toLowerCase()));
    const isAuthError = rawMessage.includes('Only admins') || rawMessage.includes('Not authenticated');
    const isNotFound = rawMessage.includes('user_id is required') || rawMessage.includes('Invalid user_id');

    const status = isAuthError ? 403 : isNotFound ? 404 : isClientError ? 400 : 500;
    const safeMessage = (isClientError || isAuthError || isNotFound)
      ? rawMessage
      : 'Internal server error';

    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...getCorsHeaders(requestOrigin), 'Content-Type': 'application/json' },
      status,
    });
  }
});
