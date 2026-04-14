import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, Trash2, RefreshCw, Calendar, Lock, TrendingUp, TrendingDown, Wallet, Copy } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { useFinance } from '@modules/finance/hooks/useFinance';
import type { TransactionType } from '@services/financeService';

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
  const [newRevenue, setNewRevenue] = useState({ amount: '', description: '' });
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
  const [carryingOver, setCarryingOver] = useState(false);

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

  const handleCarryOver = async () => {
    if (expenseItems.length === 0) return;
    setCarryingOver(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      for (const item of expenseItems) {
        if (item.is_auto) continue;
        await createTransaction({
          type: 'expense',
          category: item.category,
          description: `${item.description || item.category} (مرحّل من ${monthLabel})`,
          amount: item.amount,
          month_year: nextMonth,
          date: `${nextMonth}-01`,
        });
      }
    } finally {
      setCarryingOver(false);
    }
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
          <p className="text-xs text-muted-foreground mt-0.5">{monthLabel} — {balance >= 0 ? '✅ ربح' : '⚠️ خسارة'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-xl bg-muted/40 px-3 py-1.5 border border-border/50 text-[11px] font-bold text-muted-foreground">
            <Calendar size={13} className="me-1.5 text-primary/70" />{monthLabel}
          </div>
          <Button variant="outline" size="sm" onClick={() => void syncSalaries()} disabled={isSyncing} className="gap-1.5 h-8 text-xs">
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} /> مزامنة الرواتب
          </Button>
          <Button variant="outline" size="sm" onClick={handleCarryOver} disabled={carryingOver || expenseItems.length === 0} className="gap-1.5 h-8 text-xs">
            <Copy size={13} /> ترحيل المصاريف للشهر التالي
          </Button>
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center"><TrendingUp size={22} className="text-emerald-600" /></div>
          <div>
            <p className="text-[11px] text-muted-foreground">الإيرادات</p>
            <p className="text-2xl font-black text-emerald-600">{revenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{revenueItems.length} عملية</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center"><TrendingDown size={22} className="text-rose-500" /></div>
          <div>
            <p className="text-[11px] text-muted-foreground">المصاريف</p>
            <p className="text-2xl font-black text-rose-500">{expenses.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{expenseItems.length} عملية</p>
          </div>
        </div>
        <div className={`bg-card rounded-2xl shadow-card p-5 flex items-center gap-4 ring-2 ${balance >= 0 ? 'ring-emerald-300 dark:ring-emerald-700' : 'ring-rose-300 dark:ring-rose-700'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-rose-100 dark:bg-rose-950/40'}`}>
            <Wallet size={22} className={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
            <p className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
            </p>
            <p className="text-[10px] font-semibold">{balance >= 0 ? '✅ كسبان' : '⚠️ خسران'}</p>
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
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">المبلغ (ر.س)</th>
                <th className="px-3 py-2 text-start text-[11px] font-semibold text-muted-foreground">الوصف</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
              ) : revenueItems.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">لا توجد إيرادات — أضف من الأسفل</td></tr>
              ) : (
                revenueItems.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <tr key={t.id} className="border-t border-border/20 hover:bg-muted/10">
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-sm text-foreground">{t.description || t.category}</td>
                    <td className="px-3 py-2.5 text-center">
                      {t.is_auto ? <Lock size={12} className="mx-auto text-muted-foreground/40" /> : (
                        <button type="button" onClick={() => void deleteTransaction(t.id)} disabled={isDeleting} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
                <td className="px-2 py-2">
                  <Input type="number" min="0" step="0.01" placeholder="0" value={newRevenue.amount} onChange={e => setNewRevenue(r => ({ ...r, amount: e.target.value }))} className="h-9 text-sm text-center font-bold w-full" dir="ltr" />
                </td>
                <td className="px-2 py-2">
                  <Input placeholder="وصف الإيراد..." value={newRevenue.description} onChange={e => setNewRevenue(r => ({ ...r, description: e.target.value }))} className="h-9 text-sm w-full" dir="rtl" />
                </td>
                <td className="px-2 py-2 text-center">
                  <Button size="sm" onClick={() => void handleAddRow('revenue')} disabled={isSaving || !newRevenue.amount} className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700">
                    <Plus size={16} />
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
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">المبلغ (ر.س)</th>
                <th className="px-3 py-2 text-start text-[11px] font-semibold text-muted-foreground">الوصف</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
              ) : expenseItems.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">لا توجد مصاريف — أضف من الأسفل أو اضغط مزامنة الرواتب</td></tr>
              ) : (
                expenseItems.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <tr key={t.id} className="border-t border-border/20 hover:bg-muted/10">
                    <td className="px-3 py-2.5 text-center font-bold text-rose-500">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {t.description || t.category}
                      {t.is_auto && <span className="text-[10px] text-muted-foreground ms-1.5">🔒 تلقائي</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!t.is_auto && (
                        <button type="button" onClick={() => void deleteTransaction(t.id)} disabled={isDeleting} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10">
                <td className="px-2 py-2">
                  <Input type="number" min="0" step="0.01" placeholder="0" value={newExpense.amount} onChange={e => setNewExpense(r => ({ ...r, amount: e.target.value }))} className="h-9 text-sm text-center font-bold w-full" dir="ltr" />
                </td>
                <td className="px-2 py-2">
                  <Input placeholder="وصف المصروف..." value={newExpense.description} onChange={e => setNewExpense(r => ({ ...r, description: e.target.value }))} className="h-9 text-sm w-full" dir="rtl" />
                </td>
                <td className="px-2 py-2 text-center">
                  <Button size="sm" onClick={() => void handleAddRow('expense')} disabled={isSaving || !newExpense.amount} className="h-9 w-9 p-0 bg-rose-500 hover:bg-rose-600">
                    <Plus size={16} />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Smart Recommendations ──────────────────────── */}
      {!loading && (revenue > 0 || expenses > 0) && (
        <div className="bg-card rounded-2xl shadow-card p-5 border border-primary/20">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            💡 توصيات ذكية
          </h3>
          <div className="space-y-2">
            {balance < 0 && (
              <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg px-3 py-2.5">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-rose-600">أنت خسران {Math.abs(balance).toLocaleString()} ر.س هذا الشهر</p>
                  <p className="text-xs text-muted-foreground mt-0.5">حاول زيادة الإيرادات أو تقليل المصاريف غير الضرورية</p>
                </div>
              </div>
            )}
            {balance >= 0 && balance < expenses * 0.1 && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2.5">
                <span className="text-amber-500 text-lg leading-none mt-0.5">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-amber-600">هامش الربح ضعيف ({revenue > 0 ? ((balance / revenue) * 100).toFixed(0) : 0}%)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">الربح قليل مقارنة بالإيرادات — حاول تقليل المصاريف أو زيادة الطلبات</p>
                </div>
              </div>
            )}
            {expenses > 0 && (() => {
              const salaryExpense = expenseItems.filter(e => e.is_auto || e.category === 'رواتب').reduce((s, e) => s + e.amount, 0);
              const salaryPct = (salaryExpense / expenses) * 100;
              if (salaryPct > 70) return (
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2.5">
                  <span className="text-blue-500 text-lg leading-none mt-0.5">📊</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-600">الرواتب تشكل {salaryPct.toFixed(0)}% من المصاريف</p>
                    <p className="text-xs text-muted-foreground mt-0.5">زيادة عدد الطلبات لكل مندوب تقلل تكلفة الطلب الواحد وترفع الربح</p>
                  </div>
                </div>
              );
              return null;
            })()}
            {revenue > 0 && (() => {
              const revenueByDesc = new Map<string, number>();
              revenueItems.forEach(r => {
                const key = r.description || r.category;
                revenueByDesc.set(key, (revenueByDesc.get(key) ?? 0) + r.amount);
              });
              const sorted = [...revenueByDesc.entries()].sort((a, b) => b[1] - a[1]);
              const top = sorted[0];
              if (top && sorted.length > 1) return (
                <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2.5">
                  <span className="text-emerald-500 text-lg leading-none mt-0.5">🚀</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-600">أعلى مصدر إيراد: {top[0]} ({top[1].toLocaleString()} ر.س)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ركّز على هذا المصدر لزيادة الأرباح — {((top[1] / revenue) * 100).toFixed(0)}% من إجمالي الإيرادات</p>
                  </div>
                </div>
              );
              return null;
            })()}
            {balance >= 0 && balance >= expenses * 0.3 && (
              <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2.5">
                <span className="text-emerald-500 text-lg leading-none mt-0.5">✅</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-600">أداء ممتاز! هامش ربح {revenue > 0 ? ((balance / revenue) * 100).toFixed(0) : 0}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">استمر على هذا الأداء — الإيرادات تغطي المصاريف بشكل جيد</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
