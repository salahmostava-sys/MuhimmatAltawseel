import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, Trash2, RefreshCw, Calendar, Lock, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { useFinance } from '@modules/finance/hooks/useFinance';
import type { TransactionType } from '@services/financeService';

/* ─── Main Page ─────────────────────────────────────────── */

export default function FinancePage() {
  const { selectedMonth } = useTemporalContext();
  const {
    loading, error, refetch,
    revenue, expenses, balance,
    revenueItems, expenseItems,
    createTransaction, deleteTransaction, syncSalaries,
    isSaving, isDeleting, isSyncing,
  } = useFinance();

  const monthLabel = format(new Date(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ar });

  // Inline add state
  const [newRevenue, setNewRevenue] = useState({ amount: '', description: '' });
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });

  const handleAddRow = async (type: TransactionType) => {
    const row = type === 'revenue' ? newRevenue : newExpense;
    if (!row.amount || Number(row.amount) <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    await createTransaction({
      type,
      category: type === 'revenue' ? 'إيرادات' : 'مصاريف',
      description: row.description || undefined,
      amount: Number(row.amount),
      month_year: selectedMonth,
      date: today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`,
    });
    if (type === 'revenue') setNewRevenue({ amount: '', description: '' });
    else setNewExpense({ amount: '', description: '' });
  };

  if (error && !loading) {
    return <div className="space-y-4" dir="rtl"><QueryErrorRetry error={error} onRetry={() => void refetch()} title="تعذر تحميل البيانات المالية" /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-1">
            <span>الرئيسية</span><span>/</span><span className="font-medium">المصاريف والإيرادات</span>
          </nav>
          <h1 className="text-xl font-black text-foreground">المصاريف والإيرادات</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-muted/40 px-3 py-1.5 border border-border/50 text-[11px] font-bold text-muted-foreground">
            <Calendar size={13} className="me-1.5 text-primary/70" />{monthLabel}
          </div>
          <Button variant="outline" size="sm" onClick={() => void syncSalaries()} disabled={isSyncing} className="gap-1.5 h-8 text-xs">
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} /> مزامنة الرواتب
          </Button>
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl shadow-card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center"><TrendingUp size={20} className="text-emerald-600" /></div>
          <div>
            <p className="text-[11px] text-muted-foreground">الإيرادات</p>
            <p className="text-xl font-black text-emerald-600">{revenue.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center"><TrendingDown size={20} className="text-rose-500" /></div>
          <div>
            <p className="text-[11px] text-muted-foreground">المصاريف</p>
            <p className="text-xl font-black text-rose-500">{expenses.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
          </div>
        </div>
        <div className={`bg-card rounded-2xl shadow-card p-4 flex items-center gap-3 ring-2 ${balance >= 0 ? 'ring-emerald-200 dark:ring-emerald-800' : 'ring-rose-200 dark:ring-rose-800'}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-rose-100 dark:bg-rose-950/40'}`}>
            <Wallet size={20} className={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">الفرق</p>
            <p className={`text-xl font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString()} <span className="text-xs font-normal">ر.س</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{balance >= 0 ? '✅ ربح' : '⚠️ خسارة'}</p>
          </div>
        </div>
      </div>

      {/* ── Two Columns ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── REVENUES ─────────────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="px-4 py-3 border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">💰 الإيرادات</h3>
            <span className="text-xs text-emerald-600 font-bold">{revenue.toLocaleString()} ر.س</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">المبلغ</th>
                <th className="px-3 py-2 text-start text-[11px] font-semibold text-muted-foreground">الوصف</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-6 text-muted-foreground text-xs">جاري التحميل...</td></tr>
              ) : revenueItems.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-6 text-muted-foreground text-xs">لا توجد إيرادات</td></tr>
              ) : (
                revenueItems.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <tr key={t.id} className="border-t border-border/20 hover:bg-muted/10">
                    <td className="px-3 py-2 text-center font-bold text-emerald-600 text-xs">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-foreground">{t.description || t.category}</td>
                    <td className="px-3 py-2 text-center">
                      {t.is_auto ? <Lock size={12} className="mx-auto text-muted-foreground/40" /> : (
                        <button type="button" onClick={() => void deleteTransaction(t.id)} disabled={isDeleting} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {/* Add row */}
              <tr className="border-t-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
                <td className="px-3 py-2">
                  <Input type="number" min="0" placeholder="المبلغ" value={newRevenue.amount} onChange={e => setNewRevenue(r => ({ ...r, amount: e.target.value }))} className="h-8 text-xs text-center font-bold" dir="ltr" />
                </td>
                <td className="px-3 py-2">
                  <Input placeholder="الوصف..." value={newRevenue.description} onChange={e => setNewRevenue(r => ({ ...r, description: e.target.value }))} className="h-8 text-xs" />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button size="sm" onClick={() => void handleAddRow('revenue')} disabled={isSaving || !newRevenue.amount} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                    <Plus size={14} />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── EXPENSES ─────────────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-rose-200/50 dark:border-rose-800/30">
          <div className="px-4 py-3 border-b border-border/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">💸 المصاريف</h3>
            <span className="text-xs text-rose-500 font-bold">{expenses.toLocaleString()} ر.س</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">المبلغ</th>
                <th className="px-3 py-2 text-start text-[11px] font-semibold text-muted-foreground">الوصف</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-6 text-muted-foreground text-xs">جاري التحميل...</td></tr>
              ) : expenseItems.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-6 text-muted-foreground text-xs">لا توجد مصاريف</td></tr>
              ) : (
                expenseItems.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <tr key={t.id} className="border-t border-border/20 hover:bg-muted/10">
                    <td className="px-3 py-2 text-center font-bold text-rose-500 text-xs">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-foreground">{t.description || t.category}</td>
                    <td className="px-3 py-2 text-center">
                      {t.is_auto ? <Lock size={12} className="mx-auto text-muted-foreground/40" title="تلقائي — من الرواتب" /> : (
                        <button type="button" onClick={() => void deleteTransaction(t.id)} disabled={isDeleting} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {/* Add row */}
              <tr className="border-t-2 border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10">
                <td className="px-3 py-2">
                  <Input type="number" min="0" placeholder="المبلغ" value={newExpense.amount} onChange={e => setNewExpense(r => ({ ...r, amount: e.target.value }))} className="h-8 text-xs text-center font-bold" dir="ltr" />
                </td>
                <td className="px-3 py-2">
                  <Input placeholder="الوصف..." value={newExpense.description} onChange={e => setNewExpense(r => ({ ...r, description: e.target.value }))} className="h-8 text-xs" />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button size="sm" onClick={() => void handleAddRow('expense')} disabled={isSaving || !newExpense.amount} className="h-8 w-8 p-0 bg-rose-500 hover:bg-rose-600">
                    <Plus size={14} />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
