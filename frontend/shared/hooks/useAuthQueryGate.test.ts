import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockAuthState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  session: null as { access_token: string } | null,
  authLoading: false,
}));

vi.mock('@app/providers/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.unmock('@shared/hooks/useAuthQueryGate');

import { useAuthQueryGate, authQueryUserId } from './useAuthQueryGate';

describe('authQueryUserId', () => {
  it('returns __none__ for null', () => {
    expect(authQueryUserId(null)).toBe('__none__');
  });

  it('returns __none__ for undefined', () => {
    expect(authQueryUserId(undefined)).toBe('__none__');
  });

  it('returns the userId string when provided', () => {
    expect(authQueryUserId('user-123')).toBe('user-123');
  });
});

describe('useAuthQueryGate', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.session = null;
    mockAuthState.authLoading = false;
  });

  it('enabled = false when session is null', () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.session = null;
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.enabled).toBe(false);
  });

  it('enabled = false when authLoading = true', () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.session = { access_token: 'tok' };
    mockAuthState.authLoading = true;
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.enabled).toBe(false);
  });

  it('enabled = true when session exists and not loading', () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.session = { access_token: 'tok' };
    mockAuthState.authLoading = false;
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.enabled).toBe(true);
  });

  it('userId = null when no user', () => {
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.userId).toBeNull();
  });

  it('userId = user.id when logged in', () => {
    mockAuthState.user = { id: 'user-abc' };
    mockAuthState.session = { access_token: 'tok' };
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.userId).toBe('user-abc');
  });

  it('authReady = false when user is null', () => {
    mockAuthState.session = { access_token: 'tok' };
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.authReady).toBe(false);
  });

  it('authReady = true when user exists and not loading', () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.authLoading = false;
    const { result } = renderHook(() => useAuthQueryGate());
    expect(result.current.authReady).toBe(true);
  });
});
