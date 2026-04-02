import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAccountsTable } from './PlatformAccountsTable';
import type { PlatformAccountView } from '@modules/platform-accounts/types';

describe('PlatformAccountsTable permissions gating', () => {
  const baseAccount: PlatformAccountView = {
    id: 'acc-1',
    app_id: 'app-1',
    account_username: 'acc-user',
    account_id_on_platform: 'P-1',
    iqama_number: null,
    iqama_expiry_date: null,
    status: 'active',
    notes: null,
    created_at: '2026-04-01T00:00:00Z',
    current_employee: null,
    assignments_this_month_count: 0,
    app_name: 'App 1',
    app_color: '#111111',
    app_text_color: '#ffffff',
  };

  it('لا يعرض أزرار التعيين/التعديل عندما canEdit=false', () => {
    render(
      <PlatformAccountsTable
        loading={false}
        accountsCount={1}
        accounts={[baseAccount]}
        alertDays={90}
        sortKey="iqama_expiry_date"
        sortDir="asc"
        canEdit={false}
        onToggleSort={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenAssign={vi.fn()}
        onOpenEdit={vi.fn()}
      />,
    );

    expect(screen.getByTitle('السجل التاريخي')).toBeInTheDocument();
    expect(screen.queryByTitle('تعيين مندوب')).toBeNull();
    expect(screen.queryByText('تعديل')).toBeNull();
  });

  it('يعرض أزرار التعيين/التعديل عندما canEdit=true', () => {
    render(
      <PlatformAccountsTable
        loading={false}
        accountsCount={1}
        accounts={[baseAccount]}
        alertDays={90}
        sortKey="iqama_expiry_date"
        sortDir="asc"
        canEdit={true}
        onToggleSort={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenAssign={vi.fn()}
        onOpenEdit={vi.fn()}
      />,
    );

    expect(screen.getByTitle('السجل التاريخي')).toBeInTheDocument();
    expect(screen.getByTitle('تعيين مندوب')).toBeInTheDocument();
    expect(screen.getByText('تعديل')).toBeInTheDocument();
  });
});

