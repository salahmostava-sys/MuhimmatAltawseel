import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockAuthState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  role: null as string | null,
}));

vi.mock('@app/providers/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

import { usePermissions, DEFAULT_PERMISSIONS } from './usePermissions';

describe('DEFAULT_PERMISSIONS — role matrix', () => {
  it('admin can perform all actions on employees', () => {
    const p = DEFAULT_PERMISSIONS.admin.employees;
    expect(p.can_view).toBe(true);
    expect(p.can_edit).toBe(true);
    expect(p.can_delete).toBe(true);
  });

  it('admin can perform all actions on salaries', () => {
    const p = DEFAULT_PERMISSIONS.admin.salaries;
    expect(p).toEqual({ can_view: true, can_edit: true, can_delete: true });
  });

  it('viewer canEdit = false on all pages', () => {
    for (const page of Object.keys(DEFAULT_PERMISSIONS.viewer)) {
      expect(DEFAULT_PERMISSIONS.viewer[page].can_edit).toBe(false);
    }
  });

  it('viewer canDelete = false on all pages', () => {
    for (const page of Object.keys(DEFAULT_PERMISSIONS.viewer)) {
      expect(DEFAULT_PERMISSIONS.viewer[page].can_delete).toBe(false);
    }
  });

  it('finance has access to salary pages', () => {
    const p = DEFAULT_PERMISSIONS.finance.salaries;
    expect(p.can_view).toBe(true);
    expect(p.can_edit).toBe(true);
  });

  it('finance has access to advances', () => {
    const p = DEFAULT_PERMISSIONS.finance.advances;
    expect(p.can_view).toBe(true);
    expect(p.can_edit).toBe(true);
  });

  it('hr has no access to finance-only pages (deductions)', () => {
    const p = DEFAULT_PERMISSIONS.hr.deductions;
    expect(p.can_view).toBe(false);
    expect(p.can_edit).toBe(false);
    expect(p.can_delete).toBe(false);
  });

  it('hr cannot edit salaries', () => {
    const p = DEFAULT_PERMISSIONS.hr.salaries;
    expect(p.can_view).toBe(true);
    expect(p.can_edit).toBe(false);
  });

  it('operations can manage maintenance', () => {
    const p = DEFAULT_PERMISSIONS.operations.maintenance;
    expect(p.can_view).toBe(true);
    expect(p.can_edit).toBe(true);
    expect(p.can_delete).toBe(true);
  });

  it('operations cannot access salaries', () => {
    const p = DEFAULT_PERMISSIONS.operations.salaries;
    expect(p.can_view).toBe(false);
  });
});

describe('usePermissions hook', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.role = null;
    vi.clearAllMocks();
  });

  it('denies all when no user', async () => {
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual({ can_view: false, can_edit: false, can_delete: false });
  });

  it('denies all when user exists but no role', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = null;
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual({ can_view: false, can_edit: false, can_delete: false });
  });

  it('isAdmin = true for admin role', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'admin';
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });

  it('isAdmin = false for non-admin role', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'viewer';
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('falls back to role defaults when no custom permissions in DB', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'admin';
    const { result } = renderHook(() => usePermissions('salaries'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual({ can_view: true, can_edit: true, can_delete: true });
  });

  it('viewer gets deny-all on employees', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'viewer';
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions.can_view).toBe(false);
    expect(result.current.permissions.can_edit).toBe(false);
    expect(result.current.permissions.can_delete).toBe(false);
  });

  it('المشاهد لا يستطيع التعديل', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'viewer';
    const { result } = renderHook(() => usePermissions('maintenance'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions.can_edit).toBe(false);
  });

  it('المشاهد لا يستطيع الحذف', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'viewer';
    const { result } = renderHook(() => usePermissions('maintenance'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions.can_delete).toBe(false);
  });

  it('المسؤول يملك صلاحيات كاملة', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'admin';
    const { result } = renderHook(() => usePermissions('employees'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual({ can_view: true, can_edit: true, can_delete: true });
  });

  it('المالية: صلاحية الرواتب', async () => {
    mockAuthState.user = { id: 'u1' };
    mockAuthState.role = 'finance';
    const { result } = renderHook(() => usePermissions('salaries'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions.can_view).toBe(true);
    expect(result.current.permissions.can_edit).toBe(true);
  });
});
