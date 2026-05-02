import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, fetchMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('./supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('./serviceError', () => ({
  throwIfError: vi.fn((error: unknown, context: string) => {
    if (!error) return;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: ${message}`);
  }),
}));

import { authService } from './authService';

describe('authService admin user management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null,
    });
    globalThis.fetch = fetchMock as typeof fetch;
  });

  it('createManagedUser sends create_user payload and returns the created user id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: 'user-99' }),
    } as Response);

    const result = await authService.createManagedUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'operations',
    });

    expect(getSessionMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/functions/admin-update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-access-token' },
      body: JSON.stringify({
        action: 'create_user',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'operations',
      }),
    });
    expect(result).toEqual({ user_id: 'user-99' });
  });

  it('createManagedUser rejects responses that omit the new user id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await expect(
      authService.createManagedUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer',
      }),
    ).rejects.toThrow('authService.createManagedUser: missing user_id');
  });

  it('deleteManagedUser sends delete_user payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await authService.deleteManagedUser('user-7');

    expect(fetchMock).toHaveBeenCalledWith('/api/functions/admin-update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-access-token' },
      body: JSON.stringify({ user_id: 'user-7', action: 'delete_user' }),
    });
  });
});
