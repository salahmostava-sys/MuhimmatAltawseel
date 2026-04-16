import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@services/authService';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthFailure } from '@shared/lib/auth/authFailureBus';
import { logError } from '@shared/lib/logger';
import { useSessionManager } from '@shared/hooks/useSessionManager';
import { getErrorMessage } from '@services/serviceError';

type AppRole = 'admin' | 'hr' | 'finance' | 'operations' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** Initial auth resolution + session refresh in flight — use for UI spinners. */
  loading: boolean;
  /** Same as `loading` — use for React Query `enabled: … && !authLoading`. */
  authLoading: boolean;
  recoverSessionSilently: (opts?: { refetchActiveQueries?: boolean }) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const AUTH_SIGNIN_TIMEOUT_MS = 15_000;
const AUTH_ACTIVE_CHECK_TIMEOUT_MS = 10_000;

/** Races a promise against a timeout. Rejects with a `:timeout` error if the promise takes too long. */
const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}:timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const fetchRole = async (userId: string): Promise<AppRole | null> => {
  return authService.fetchUserRole(userId);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const recoverInFlightRef = useRef<Promise<boolean> | null>(null);
  const isFirstLoad = useRef(true);
  const redirectLockRef = useRef(false);
  const redirectCooldownUntilRef = useRef(0);

  const isPublicAuthRoute = useCallback((pathname: string) => (
    pathname === '/login'
  ), []);

  const redirectToLoginIfNeeded = useCallback(() => {
    if (redirectLockRef.current) return;
    if (isPublicAuthRoute(location.pathname)) return;
    const now = Date.now();
    if (now < redirectCooldownUntilRef.current) return;
    redirectLockRef.current = true;
    redirectCooldownUntilRef.current = now + 2000;
    navigate('/login', { replace: true, state: { from: location.pathname } });
    setTimeout(() => { redirectLockRef.current = false; }, 300);
  }, [isPublicAuthRoute, location.pathname, navigate]);

  const handleUnauthenticatedState = useCallback(async (reason: string) => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch (e) {
      logError('[Auth] queryClient cancel/clear failed', e);
    }
    setRefreshing(false);
    setLoading(false);
    setSession(null);
    setUser(null);
    setRole(null);
    logError('[Auth] transitioning to unauthenticated state', { reason }, { level: 'warn' });
    redirectToLoginIfNeeded();
  }, [queryClient, redirectToLoginIfNeeded]);

  const forceSignOut = useCallback(async () => {
    const currentUser = await authService.getCurrentUser();
    const userId = currentUser?.id ?? user?.id ?? null;
    await authService.signOut();
    try {
      await authService.revokeSession(userId);
    } catch (e) {
      logError('[Auth] revokeSession failed (session may already be cleared)', e);
    }
    setUser(null);
    setSession(null);
    setRole(null);
    // Clear session-scoped data so next login starts fresh
    sessionStorage.removeItem('global_selected_month');
    redirectToLoginIfNeeded();
  }, [redirectToLoginIfNeeded, user?.id]);

  // FIX: cache the fetched role per userId to prevent redundant DB calls on every
  // tab focus, visibility change, and token refresh. The role almost never changes
  // during a session. Cache is invalidated on user switch (different userId).
  const cachedRoleRef = useRef<{ userId: string; role: AppRole | null } | null>(null);

  /**
   * Shared helper: checks if a user is still active, then applies the session to state.
   * Returns false and calls forceSignOut() if the user is deactivated.
   *
   * Extracted to eliminate the repeated pattern that was duplicated in 4 places:
   *   1. onAuthStateChange handler
   *   2. getSession() bootstrap
   *   (previously also in signIn and the profile-active polling effect)
   */
  const checkActiveAndApplySession = useCallback(async (
    sessionToApply: Session,
    context: string,
  ): Promise<boolean> => {
    const userId = sessionToApply.user.id;
    try {
      const active = await withTimeout(
        authService.fetchIsActive(userId),
        AUTH_ACTIVE_CHECK_TIMEOUT_MS,
        'authService.fetchIsActive',
      );
      if (!active) {
        await forceSignOut();
        return false;
      }
      setSession(sessionToApply);
      setUser(sessionToApply.user);
      // Use cached role if same user — avoids redundant DB/RPC call on every tab focus
      let r: AppRole | null;
      if (cachedRoleRef.current?.userId === userId) {
        r = cachedRoleRef.current.role;
      } else {
        r = await withTimeout(
          fetchRole(userId),
          AUTH_ACTIVE_CHECK_TIMEOUT_MS,
          'authService.fetchUserRole',
        );
        cachedRoleRef.current = { userId, role: r };
      }
      setRole(r);
      return true;
    } catch (e) {
      logError(`[Auth] checkActiveAndApplySession failed (${context})`, e);
      return false;
    }
  }, [forceSignOut]);

  const recoverSessionSilently = useCallback(async (opts?: { refetchActiveQueries?: boolean }) => {
    if (recoverInFlightRef.current !== null) return recoverInFlightRef.current;

    const task = (async () => {
      setRefreshing(true);
      try {
        const current = await authService.getSession();
        if (current?.user) {
          if (opts?.refetchActiveQueries) {
            await queryClient.refetchQueries({ type: 'active' });
          }
          return true;
        }

        // No stored session/token: avoid refreshSession() to prevent AuthSessionMissingError spam.
        if (!current) return false;
        await authService.refreshSession();

        const after = await authService.getSession();
        if (after?.user) {
          if (opts?.refetchActiveQueries) {
            await queryClient.refetchQueries({ type: 'active' });
          }
          return true;
        }
        return false;
      } catch (e) {
        logError('[Auth] recoverSessionSilently failed', e);
        return false;
      } finally {
        setRefreshing(false);
      }
    })();

    recoverInFlightRef.current = task;
    return task.finally(() => {
      recoverInFlightRef.current = null;
    });
  }, [queryClient]);

  // ── Auth state change listener + bootstrap ────────────────────────────────
  useEffect(() => {
    const subscription = authService.onAuthStateChange((event, nextSession) => {
      void (async () => {
        try {
          if (isFirstLoad.current) {
            isFirstLoad.current = false;
            // loading is turned off by getSession().finally() below,
            // AFTER session/user/role are set — avoids redirect race.
          }
          if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
            await handleUnauthenticatedState(event.toLowerCase());
            return;
          }
          if (nextSession?.user) {
            const applied = await checkActiveAndApplySession(nextSession, 'onAuthStateChange');
            if (!applied) setLoading(false);
          } else {
            setSession(null);
            setUser(null);
            setRole(null);
          }
        } catch (e) {
          logError('[Auth] onAuthStateChange handler failed', e);
        }
      })();
    });

    // Bootstrap: resolve current session on mount
    authService.getSession()
      .then(async (currentSession) => {
        if (currentSession?.user) {
          const applied = await checkActiveAndApplySession(currentSession, 'getSession.bootstrap');
          if (!applied) setLoading(false);
        }
      })
      .catch((e) => {
        logError('[Auth] getSession bootstrap failed', e);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [checkActiveAndApplySession, handleUnauthenticatedState]);

  // ── Auth failure bus (React Query errors bubble up here) ──────────────────
  useEffect(() => {
    return onAuthFailure(({ source, reason }) => {
      void handleUnauthenticatedState(`${source}:${reason}`);
    });
  }, [handleUnauthenticatedState]);

  // ── Single redirect owner ─────────────────────────────────────────────────
  // Keep unauthenticated users off protected routes.
  // Try one silent recovery before giving up and redirecting.
  useEffect(() => {
    if (loading || refreshing) return;
    if (session) return;
    void recoverSessionSilently().then((recovered) => {
      if (!recovered) redirectToLoginIfNeeded();
    });
  }, [loading, refreshing, session, redirectToLoginIfNeeded, recoverSessionSilently]);

  // ── Wake / reconnect: silent session recovery + data refresh ─────────────
  useEffect(() => {
    let lastRefreshAt = 0;
    const minMs = 240_000; // 4-minute cooldown between recovery attempts

    const onWake = async () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshAt < minMs) return;
      lastRefreshAt = now;
      const recovered = await recoverSessionSilently({ refetchActiveQueries: false });
      if (recovered) {
        void queryClient.refetchQueries({ type: 'active' });
      }
    };

    const onFocus = () => { void onWake(); };
    const onOnline = () => { void onWake(); };

    document.addEventListener('visibilitychange', onWake);
    globalThis.addEventListener('focus', onFocus);
    globalThis.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      globalThis.removeEventListener('focus', onFocus);
      globalThis.removeEventListener('online', onOnline);
    };
  }, [queryClient, recoverSessionSilently]);

  // ── Realtime: profile.is_active changes ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = authService.subscribeToProfileActiveChanges(
      user.id,
      async (payload) => {
        const updated = payload.new;
        if (updated.is_active === false) {
          await forceSignOut();
        }
      },
    );
    return () => { authService.removeRealtimeChannel(channel); };
  }, [forceSignOut, user]);

  // ── Periodic is_active polling (narrows deactivation window) ─────────────
  useEffect(() => {
    if (!user?.id) return;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const active = await authService.fetchIsActive(user.id);
      if (!active) await forceSignOut();
    };
    const id = setInterval(tick, 120_000);
    return () => clearInterval(id);
  }, [forceSignOut, user?.id]);

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await withTimeout(
        authService.signIn(email, password),
        AUTH_SIGNIN_TIMEOUT_MS,
        'authService.signIn',
      );

      if (data.user) {
        const active = await withTimeout(
          authService.fetchIsActive(data.user.id),
          AUTH_ACTIVE_CHECK_TIMEOUT_MS,
          'authService.fetchIsActive',
        );
        if (!active) {
          await authService.signOut();
          return { error: { message: 'هذا الحساب معطّل. تواصل مع المسؤول.' } };
        }
      }

      return { error: null };
    } catch (e) {
      const msg = getErrorMessage(e, 'تعذر تسجيل الدخول');
      if (msg.includes(':timeout')) {
        return { error: { message: 'انتهت مهلة الاتصال بالخادم. تحقّق من الإنترنت وإعدادات Supabase ثم حاول مجددًا.' } };
      }
      return { error: { message: msg } };
    }
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (e) {
      logError('[Auth] signOut fallback: remote signOut failed, forcing local unauthenticated state', e, { level: 'warn' });
    } finally {
      await handleUnauthenticatedState('manual_signout');
    }
  }, [handleUnauthenticatedState]);

  // ── Session inactivity management (auto-logout + cross-tab sync) ──────────
  useSessionManager({ session, signOut, queryClient });

  // Only initial loading blocks the UI — silent background refreshes should NOT
  // set authLoading=true (which would disable queries and close modals).
  const busy = loading;
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    role,
    loading: busy,
    authLoading: busy,
    recoverSessionSilently,
    signIn,
    signOut,
  }), [user, session, role, busy, recoverSessionSilently, signIn, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
