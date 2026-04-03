/**
 * useSessionManager — React hook that wires SessionManager into AuthContext.
 *
 * - Starts tracking only when the user has an active session.
 * - Shows Arabic warning toast 30s before timeout.
 * - Auto-logout clears React Query cache and calls signOut.
 * - Listens for cross-tab logout via BroadcastChannel.
 * - Listens for Supabase auth state changes (SIGNED_OUT / TOKEN_REFRESH_FAILED).
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SessionManager } from '@shared/lib/session/sessionManager';
import {
  TOAST_SESSION_WARNING,
  TOAST_SESSION_EXPIRED,
  TOAST_SESSION_EXPIRED_OTHER_TAB,
} from '@shared/lib/toastMessages';

interface UseSessionManagerOpts {
  /** Current Supabase session (null = not authenticated). */
  session: Session | null;
  /** signOut function from AuthContext. */
  signOut: () => Promise<void>;
  /** React Query client for cache clearing. */
  queryClient: QueryClient;
}

/**
 * Drop this hook inside AuthProvider to enable inactivity tracking.
 * It is a pure side-effect hook — no return value, no state changes.
 */
export function useSessionManager({ session, signOut, queryClient }: UseSessionManagerOpts): void {
  const managerRef = useRef<SessionManager | null>(null);
  const signOutRef = useRef(signOut);
  const queryClientRef = useRef(queryClient);
  // Guard against double-firing of timeout callback
  const logoutInFlightRef = useRef(false);

  // Keep refs in sync so the callbacks never go stale
  useEffect(() => { signOutRef.current = signOut; }, [signOut]);
  useEffect(() => { queryClientRef.current = queryClient; }, [queryClient]);

  // ── Timeout handler ────────────────────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;

    try {
      // Clear all cached data first
      await queryClientRef.current.cancelQueries();
      queryClientRef.current.clear();
    } catch {
      // best-effort
    }

    toast.error(TOAST_SESSION_EXPIRED, { duration: 5000, id: 'session-expired' });

    try {
      await signOutRef.current();
    } catch {
      // signOut may fail if session is already gone — AuthContext handles redirect
    } finally {
      logoutInFlightRef.current = false;
    }
  }, []);

  // ── Warning handler ────────────────────────────────────────────────────────
  const handleWarning = useCallback(() => {
    toast(TOAST_SESSION_WARNING, {
      duration: 58_000, // stays visible until timeout or dismissal (58 seconds)
      id: 'session-warning',
      icon: '⏳',
    });
  }, []);

  // ── Activity from other tab ────────────────────────────────────────────────
  const handleOtherTabActivity = useCallback(() => {
    // Dismiss the warning toast if another tab had activity
    toast.dismiss('session-warning');
  }, []);

  // ── Lifecycle: start / stop based on session ───────────────────────────────
  useEffect(() => {
    if (!session) {
      // No session → tear down any existing manager
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
      return;
    }

    // Session exists → create and start the manager
    const manager = new SessionManager({
      onWarning: handleWarning,
      onTimeout: () => { void handleTimeout(); },
      onActivityFromOtherTab: handleOtherTabActivity,
    });
    managerRef.current = manager;
    manager.start();

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [session, handleWarning, handleTimeout, handleOtherTabActivity]);
}
