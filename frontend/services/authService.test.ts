import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('./supabase/client', () => ({
  supabase: {
    auth: {},
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    functions: {
      invoke: invokeMock,
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
  });

  it('createManagedUser sends create_user payload and returns the created user id', async () => {
    invokeMock.mockResolvedValue({
      data: { user_id: 'user-99' },
      error: null,
    });

    const result = await authService.createManagedUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'operations',
    });

    expect(invokeMock).toHaveBeenCalledWith('admin-update-user', {
      body: {
        action: 'create_user',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'operations',
      },
    });
    expect(result).toEqual({ user_id: 'user-99' });
  });

  it('createManagedUser rejects responses that omit the new user id', async () => {
    invokeMock.mockResolvedValue({
      data: { success: true },
      error: null,
    });

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
    invokeMock.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    await authService.deleteManagedUser('user-7');

    expect(invokeMock).toHaveBeenCalledWith('admin-update-user', {
      body: { user_id: 'user-7', action: 'delete_user' },
    });
  });
});
