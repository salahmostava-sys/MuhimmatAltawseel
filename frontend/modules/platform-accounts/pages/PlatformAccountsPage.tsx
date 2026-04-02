import { format, parseISO } from 'date-fns';
import {
  Plus, Edit, Search, UserPlus, Loader2, X,
  ShieldCheck, History,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@shared/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@shared/components/ui/select';
import { ColorBadge } from '@shared/components/ui/ColorBadge';
import { sortArrowGlyph } from '@shared/lib/sortTableIndicators';
import { usePlatformAccountsPage } from '@modules/platform-accounts/hooks/usePlatformAccountsPage';
import { getIqamaBadge as iqamaBadge } from '@modules/platform-accounts/lib/platformAccountsModel';

const PlatformAccounts = () => {
  const {
    perms,
    loading,
    alertDays,
    accounts,
    apps,
    employees,
    employeesFull,
    activeCount,
    warnCount,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    platformFilter,
    setPlatformFilter,
    sortKey,
    sortDir,
    toggleSort,
    sortedAccounts,
    accountDialog,
    setAccountDialog,
    editingAccount,
    accountForm,
    setAccountForm,
    savingAccount,
    openAddAccount,
    openEditAccount,
    accountEmployeeSelectValue,
    accountEmployeeOrphan,
    applyEmployeeToAccountForm,
    saveAccount,
    assignDialog,
    setAssignDialog,
    assignTarget,
    assignForm,
    setAssignForm,
    savingAssign,
    openAssign,
    saveAssign,
    historyDialog,
    setHistoryDialog,
    historyAccount,
    historyLoading,
    openHistory,
    clearFilters,
  } = usePlatformAccountsPage();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <nav className="page-breadcrumb">
          <span>ط§ظ„ط±ط¦ظٹط³ظٹط©</span>
          <span className="page-breadcrumb-sep">/</span>
          <span>ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ظ†طµط§طھ</span>
        </nav>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <ShieldCheck size={20} /> ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ظ†طµط§طھ
            </h1>
            <p className="page-subtitle">
              {loading ? 'ط¬ط§ط±ظچ ط§ظ„طھط­ظ…ظٹظ„...' : `${accounts.length} ط­ط³ط§ط¨ â€” ${activeCount} ظ†ط´ط·`}
              {warnCount > 0 && <span className="text-destructive mr-2 font-semibold">آ· {warnCount} ط¥ظ‚ط§ظ…ط© طھط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©</span>}
            </p>
          </div>
          {perms.can_edit && (
            <Button size="sm" className="gap-2" onClick={openAddAccount}>
              <Plus size={15} /> ط¥ط¶ط§ظپط© ط­ط³ط§ط¨
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط³ط§ط¨ط§طھ</p>
          <p className="text-3xl font-bold mt-1">{accounts.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">ظ†ط´ط·ط©</p>
          <p className="text-3xl font-bold text-success mt-1">{activeCount}</p>
        </div>
        <div className="stat-card border-r-4 border-r-warning">
          <p className="text-sm text-muted-foreground">ط¥ظ‚ط§ظ…ط§طھ ظ‚ط±ظٹط¨ط© ط§ظ„ط§ظ†طھظ‡ط§ط،</p>
          <p className="text-3xl font-bold text-warning mt-1">{warnCount}</p>
          <p className="text-xs text-muted-foreground mt-1">ط®ظ„ط§ظ„ {alertDays} ظٹظˆظ…</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">ط¹ط¯ط¯ ط§ظ„ظ…ظ†طµط§طھ</p>
          <p className="text-3xl font-bold mt-1">{apps.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ط­ط³ط§ط¨طŒ ط±ظ‚ظ… ط§ظ„ط¥ظ‚ط§ظ…ط©طŒ ط£ظˆ ط§ظ„ظ…ظ†ط¯ظˆط¨..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 h-9 text-sm"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="ط§ظ„ظ…ظ†طµط©" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ظƒظ„ ط§ظ„ظ…ظ†طµط§طھ</SelectItem>
            {apps.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="ط§ظ„ط­ط§ظ„ط©" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</SelectItem>
            <SelectItem value="active">ظ†ط´ط·</SelectItem>
            <SelectItem value="inactive">ط؛ظٹط± ظ†ط´ط·</SelectItem>
          </SelectContent>
        </Select>
        {(search || platformFilter !== 'all' || filterStatus !== 'all') && (
          <Button variant="ghost" size="sm" className="gap-1 h-9 text-muted-foreground"
            onClick={clearFilters}>
            <X size={13} /> ظ…ط³ط­
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : sortedAccounts.length === 0 ? (
        <div className="ds-card p-12 text-center text-muted-foreground">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">ظ„ط§ طھظˆط¬ط¯ ط­ط³ط§ط¨ط§طھ</p>
          <p className="text-sm mt-1">
            {accounts.length === 0
              ? 'ط£ط¶ظپ ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ظ†طµط§طھ ظ…ظ† ط²ط± "ط¥ط¶ط§ظپط© ط­ط³ط§ط¨"'
              : 'ط؛ظٹظ‘ط± ط§ظ„ط¨ط­ط« ط£ظˆ ظپظ„طھط± ط§ظ„ظ…ظ†طµط©/ط§ظ„ط­ط§ظ„ط©'}
          </p>
        </div>
      ) : (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('account_username')}>
                    ط§ط³ظ… ط§ظ„ط­ط³ط§ط¨ {sortArrowGlyph(sortKey, 'account_username', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 select-none">ط§ظ„ظ…ظ†طµط©</th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('account_id_on_platform')}>
                    ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨ {sortArrowGlyph(sortKey, 'account_id_on_platform', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('iqama_number')}>
                    ط±ظ‚ظ… ط§ظ„ط¥ظ‚ط§ظ…ط© {sortArrowGlyph(sortKey, 'iqama_number', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('iqama_expiry_date')}>
                    ط§ظ†طھظ‡ط§ط، ط§ظ„ط¥ظ‚ط§ظ…ط© {sortArrowGlyph(sortKey, 'iqama_expiry_date', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('current_employee')}>
                    ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط­ط§ظ„ظٹ {sortArrowGlyph(sortKey, 'current_employee', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none max-w-[7rem]" onClick={() => toggleSort('assignments_month')} title="ط¹ط¯ط¯ ظ…ط±ط§طھ طھط³ط¬ظٹظ„ طھط¹ظٹظٹظ† ط¹ظ„ظ‰ ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ (طھط¹ط§ظ‚ط¨ ط¹ط¯ط© ظ…ظ†ط§ط¯ظٹط¨)">
                    طھط¹ظٹظٹظ†ط§طھ ط§ظ„ط´ظ‡ط± {sortArrowGlyph(sortKey, 'assignments_month', sortDir)}
                  </th>
                  <th className="text-center font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    ط§ظ„ط­ط§ظ„ط© {sortArrowGlyph(sortKey, 'status', sortDir)}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedAccounts.map((acc) => {
                  const badge = iqamaBadge(acc.iqama_expiry_date, alertDays);
                  return (
                    <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold">{acc.account_username}</td>
                      <td className="px-4 py-3">
                        <ColorBadge
                          label={acc.app_name ?? 'â€”'}
                          bg={acc.app_color ?? '#6366f1'}
                          fg={acc.app_text_color ?? '#ffffff'}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{acc.account_id_on_platform ?? 'â€”'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{acc.iqama_number ?? 'â€”'}</td>
                      <td className="px-4 py-3">
                        {badge ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                        ) : 'â€”'}
                      </td>
                      <td className="px-4 py-3">
                        {acc.current_employee ? (
                          <span className="text-xs font-medium text-foreground">{acc.current_employee.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">ظ„ط§ ظٹظˆط¬ط¯</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs font-semibold tabular-nums ${(acc.assignments_this_month_count ?? 0) > 1 ? 'text-primary' : 'text-muted-foreground'}`}
                          title="ط¹ط¯ط¯ ط³ط¬ظ„ط§طھ ط§ظ„طھط¹ظٹظٹظ† ط§ظ„ظ…ط³ط¬ظ‘ظ„ط© ظ„ظ‡ط°ط§ ط§ظ„ط´ظ‡ط± (ط´ظ‡ط± ظˆط§ط­ط¯ ظ‚ط¯ ظٹط´ظ…ظ„ ط¹ط¯ط© ظ…ظ†ط§ط¯ظٹط¨ ط¨ط§ظ„طھطھط§ط¨ط¹)"
                        >
                          {acc.assignments_this_month_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${acc.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                          {acc.status === 'active' ? 'ظ†ط´ط·' : 'ط؛ظٹط± ظ†ط´ط·'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs text-primary"
                            onClick={() => openHistory(acc)}
                            title="ط§ظ„ط³ط¬ظ„ ط§ظ„طھط§ط±ظٹط®ظٹ"
                          >
                            <History size={13} /> ط§ظ„ط³ط¬ظ„
                          </Button>
                          {perms.can_edit && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => openAssign(acc)}
                                title="طھط¹ظٹظٹظ† ظ…ظ†ط¯ظˆط¨"
                              >
                                <UserPlus size={13} /> طھط¹ظٹظٹظ†
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => openEditAccount(acc)}
                              >
                                <Edit size={13} /> طھط¹ط¯ظٹظ„
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* â”€â”€ Add/Edit Account Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent className="max-w-lg flex flex-col max-h-[min(90vh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg" dir="rtl">
          <DialogHeader className="space-y-1.5 px-6 pt-6 pb-2 shrink-0 pr-14 text-right">
            <DialogTitle>{editingAccount ? 'طھط¹ط¯ظٹظ„ ط§ظ„ط­ط³ط§ط¨' : 'ط¥ط¶ط§ظپط© ط­ط³ط§ط¨ ط¬ط¯ظٹط¯'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط¨ ط¹ظ„ظ‰ ط§ظ„ظ…ظ†طµط© ط«ط§ط¨طھط© (ط§ط³ظ… طµط§ط­ط¨ ط§ظ„ط­ط³ط§ط¨طŒ ط§ظ„ط¥ظ‚ط§ظ…ط© ط§ظ„ظ…ط³ط¬ظ‘ظ„ط© ط¹ظ„ظ‰ ط§ظ„ط­ط³ط§ط¨). ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط­ط§ظ„ظٹ ظٹظڈط¯ط§ط± ظ…ظ† آ«طھط¹ظٹظٹظ†آ» ط£ظˆ ظٹط¸ظ‡ط± ظ…ظ† ط¢ط®ط± طھط¹ظٹظٹظ† ظ†ط´ط·ط› ظˆظٹظ…ظƒظ† ط£ظ† ظٹطھط¹ط§ظ‚ط¨ ط¹ط¯ط© ظ…ظ†ط§ط¯ظٹط¨ ط¹ظ„ظ‰ ظ†ظپط³ ط§ظ„ط­ط³ط§ط¨ ط®ظ„ط§ظ„ ط§ظ„ط´ظ‡ط±.
            </p>
            <div className="space-y-1.5">
              <Label>ط§ظ„ظ…ظ†طµط©</Label>
              <Select value={accountForm.app_id ?? ''} onValueChange={v => setAccountForm(p => ({ ...p, app_id: v }))}>
                <SelectTrigger><SelectValue placeholder="ط§ط®طھط± ط§ظ„ظ…ظ†طµط©" /></SelectTrigger>
                <SelectContent>
                  {apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-foreground">ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط¨ ط¹ظ„ظ‰ ط§ظ„ظ…ظ†طµط©</p>
              <div className="space-y-1.5">
                <Label>طµط§ط­ط¨ ط§ظ„ط­ط³ط§ط¨ (ظ…ظ† ط§ظ„ظ…ظˆط¸ظپظٹظ†)</Label>
                <p className="text-[11px] text-muted-foreground">
                  ط¹ظ†ط¯ ط§ظ„ط§ط®طھظٹط§ط± ظٹظڈط¹ط¨ظ‘ط£ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ <strong>ط±ظ‚ظ… ط§ظ„ط¥ظ‚ط§ظ…ط©</strong> ظˆ<strong>طھط§ط±ظٹط® ط§ظ†طھظ‡ط§ط، ط§ظ„ط¥ظ‚ط§ظ…ط©</strong> ظ…ظ† ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپط› ظٹظ…ظƒظ†ظƒ طھط¹ط¯ظٹظ„ظ‡ظ…ط§ ط£ط¯ظ†ط§ظ‡ ط¥ط°ط§ ط§ط®طھظ„ظپطھ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طµط©.
                </p>
                <Select
                  value={accountEmployeeSelectValue}
                  onValueChange={(v) => {
                    const id = v === '__none__' ? null : v;
                    applyEmployeeToAccountForm(id);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={editingAccount ? 'â€” ط¨ط¯ظˆظ† ط±ط¨ط· â€”' : 'ط§ط®طھط± ط§ظ„ظ…ظˆط¸ظپ'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{editingAccount ? 'â€” ط¨ط¯ظˆظ† ط±ط¨ط· (ط³ط¬ظ„ ظ‚ط¯ظٹظ…) â€”' : 'â€” ط§ط®طھط± â€”'}</SelectItem>
                    {accountEmployeeOrphan && accountForm.employee_id && (
                      <SelectItem value={accountForm.employee_id}>
                        {accountForm.account_username?.trim() || 'ظ…ظˆط¸ظپ ظ…ط±طھط¨ط· (ط؛ظٹط± ظپظٹ ط§ظ„ظ‚ط§ط¦ظ…ط©)'}
                      </SelectItem>
                    )}
                    {employeesFull.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingAccount && !accountForm.employee_id && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground">ط§ط³ظ… طµط§ط­ط¨ ط§ظ„ط­ط³ط§ط¨ (ظٹط¯ظˆظٹ â€” ط³ط¬ظ„ط§طھ ظ‚ط¯ظٹظ…ط©)</Label>
                    <Input
                      value={accountForm.account_username ?? ''}
                      onChange={(e) => setAccountForm((p) => ({ ...p, account_username: e.target.value }))}
                      placeholder="ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… / طµط§ط­ط¨ ط§ظ„ط­ط³ط§ط¨"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨ (ID ط¹ظ„ظ‰ ط§ظ„ظ…ظ†طµط©)</Label>
                  <Input value={accountForm.account_id_on_platform ?? ''} onChange={e => setAccountForm(p => ({ ...p, account_id_on_platform: e.target.value }))} placeholder="ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨" dir="ltr" />
                </div>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-foreground">ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¥ظ‚ط§ظ…ط© ط§ظ„ظ…ط³ط¬ظ‘ظ„ط© ط¹ظ„ظ‰ ط§ظ„ط­ط³ط§ط¨</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ط±ظ‚ظ… ط§ظ„ط¥ظ‚ط§ظ…ط©</Label>
                  <Input value={accountForm.iqama_number ?? ''} onChange={e => setAccountForm(p => ({ ...p, iqama_number: e.target.value }))} placeholder="1xxxxxxxxx" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>طھط§ط±ظٹط® ط§ظ†طھظ‡ط§ط، ط§ظ„ط¥ظ‚ط§ظ…ط©</Label>
                  <Input type="date" value={accountForm.iqama_expiry_date ?? ''} onChange={e => setAccountForm(p => ({ ...p, iqama_expiry_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ط§ظ„ط­ط§ظ„ط©</Label>
              <Select value={accountForm.status ?? 'active'} onValueChange={v => setAccountForm(p => ({ ...p, status: v as 'active' | 'inactive' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ظ†ط´ط·</SelectItem>
                  <SelectItem value="inactive">ط؛ظٹط± ظ†ط´ط·</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ظ…ظ„ط§ط­ط¸ط§طھ</Label>
              <Textarea value={accountForm.notes ?? ''} onChange={e => setAccountForm(p => ({ ...p, notes: e.target.value }))} placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط§ط®طھظٹط§ط±ظٹط©..." rows={2} />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2 bg-muted/30 sm:justify-start">
            <Button variant="outline" type="button" onClick={() => setAccountDialog(false)}>ط¥ظ„ط؛ط§ط،</Button>
            <Button type="button" onClick={() => void saveAccount()} disabled={savingAccount} className="gap-2">
              {savingAccount && <Loader2 size={14} className="animate-spin" />}
              {editingAccount ? 'ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ' : 'ط¥ط¶ط§ظپط© ط§ظ„ط­ط³ط§ط¨'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Assign Rider Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>طھط¹ظٹظٹظ† ظ…ظ†ط¯ظˆط¨ â€” {assignTarget?.account_username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ظ†ظپط³ ط§ظ„ط­ط³ط§ط¨ ظ‚ط¯ ظٹط¹ظ…ظ„ ط¹ظ„ظٹظ‡ <span className="font-semibold text-foreground">ط¹ط¯ط© ظ…ظ†ط§ط¯ظٹط¨ ط®ظ„ط§ظ„ ط§ظ„ط´ظ‡ط±</span> ط¨ط§ظ„طھطھط§ط¨ط¹: ظƒظ„ طھط¹ظٹظٹظ† ط¬ط¯ظٹط¯ ظٹظڈط؛ظ„ظ‚ ط§ظ„طھط¹ظٹظٹظ† ط§ظ„ط³ط§ط¨ظ‚ ظˆظٹظڈظپطھط­ ط³ط¬ظ„ ط¬ط¯ظٹط¯. ظٹط¸ظ‡ط± ظپظٹ ط§ظ„ط¬ط¯ظˆظ„ ط¹ظ…ظˆط¯ آ«طھط¹ظٹظٹظ†ط§طھ ط§ظ„ط´ظ‡ط±آ» ظ„ط¹ط¯ط¯ ظ…ط±ط§طھ ط§ظ„طھط³ط¬ظٹظ„ ظپظٹ ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ.
            </p>
            {assignTarget?.current_employee && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 text-sm">
                <span className="font-medium">ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط­ط§ظ„ظٹ:</span>
                <span>{assignTarget.current_employee.name}</span>
                <span className="text-amber-600 text-xs mr-auto">ط³ظٹطھظ… ط¥ط؛ظ„ط§ظ‚ طھط¹ظٹظٹظ†ظ‡ طھظ„ظ‚ط§ط¦ظٹط§ظ‹</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط¬ط¯ظٹط¯</Label>
              <Select value={assignForm.employee_id} onValueChange={v => setAssignForm(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {assignForm.employee_id && (() => {
                const e = employees.find(x => x.id === assignForm.employee_id);
                if (!e?.national_id && !e?.residency_expiry) return null;
                return (
                  <p className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                    {e.national_id && (
                      <span className="block">ط±ظ‚ظ… ط§ظ„ط¥ظ‚ط§ظ…ط© ظپظٹ ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ: <span className="font-mono dir-ltr inline-block">{e.national_id}</span></span>
                    )}
                    {e.residency_expiry && (
                      <span className="block">ط§ظ†طھظ‡ط§ط، ط§ظ„ط¥ظ‚ط§ظ…ط© (ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ): <span className="font-medium">{format(parseISO(String(e.residency_expiry).slice(0, 10)), 'dd/MM/yyyy')}</span></span>
                    )}
                  </p>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>طھط§ط±ظٹط® ط§ظ„ط¨ط¯ط§ظٹط©</Label>
              <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ظ…ظ„ط§ط­ط¸ط§طھ</Label>
              <Textarea value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط§ط®طھظٹط§ط±ظٹط©..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>ط¥ظ„ط؛ط§ط،</Button>
            <Button onClick={saveAssign} disabled={savingAssign} className="gap-2">
              {savingAssign && <Loader2 size={14} className="animate-spin" />}
              طھط¹ظٹظٹظ† ط§ظ„ظ…ظ†ط¯ظˆط¨
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ History Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={16} />
              ط§ظ„ط³ط¬ظ„ ط§ظ„طھط§ط±ظٹط®ظٹ â€” {historyAccount?.account_username}
              <span className="text-sm text-muted-foreground font-normal">({historyAccount?.app_name})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : !historyAccount?.assignments?.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <History size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ظ„ط§ ظٹظˆط¬ط¯ ط³ط¬ظ„ طھط¹ظٹظٹظ†ط§طھ ط¨ط¹ط¯</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const rows = historyAccount.assignments ?? [];
                  const byMonth = new Map<string, typeof rows>();
                  rows.forEach((a) => {
                    const my = a.month_year || 'â€”';
                    if (!byMonth.has(my)) byMonth.set(my, []);
                    byMonth.get(my)!.push(a);
                  });
                  const sortedMonths = Array.from(byMonth.keys()).sort((x, y) => y.localeCompare(x));
                  return sortedMonths.map((month) => (
                    <div key={month} className="space-y-2">
                      <p className="text-xs font-bold text-foreground border-b border-border pb-1">
                        ط´ظ‡ط± {month} â€” {byMonth.get(month)!.length} طھط¹ظٹظٹظ†
                        {byMonth.get(month)!.length > 1 && (
                          <span className="font-normal text-muted-foreground mr-2"> (طھط¹ط§ظ‚ط¨ ط¹ط¯ط© ظ…ظ†ط§ط¯ظٹط¨ ط¹ظ„ظ‰ ظ†ظپط³ ط§ظ„ط­ط³ط§ط¨)</span>
                        )}
                      </p>
                      {byMonth.get(month)!.map((a) => (
                        <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${!a.end_date ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!a.end_date ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{a.employee_name}</span>
                              {!a.end_date && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                                  ط´ط§ط؛ظ„ ط­ط§ظ„ظٹط§ظ‹
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ظ…ظ†: <span className="font-medium text-foreground">{a.start_date}</span>
                              {a.end_date && <> â€” ط¥ظ„ظ‰: <span className="font-medium text-foreground">{a.end_date}</span></>}
                            </p>
                            {a.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{a.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformAccounts;

