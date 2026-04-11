import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { QueryErrorRetry } from '@shared/components/QueryErrorRetry';
import { useFinance } from '@modules/finance/hooks/useFinance';
import { AddTransactionModal } from '@modules/finance/components/AddTransactionModal';
import type { TransactionType, FinanceTransaction } from '@services/financeService';

/* ─── Stat Card ─────────────────────────────────────────── */

function FinanceStatCard(props: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  sub?: string;
}>) {
  const { icon, label, value, accent, sub } = props;
  return (
    <div className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Transaction Row ───────────────────────────────────── */

function TransactionRow(props: Readonly<{
  transaction: FinanceTransaction;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}>) {
  const { transaction: t, onDelete, isDeleting } = props;
  const isRevenue = t.type === 'revenue';

  return (
    <tr className="border-b border-border/30 hover:bg-muted/10 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isRevenue ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-500'
          }`}>
            {isRevenue ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{t.category}</p>
            {t.description && <p className="text-[11px] text-muted-foreground">{t.description}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-muted-foreground font-mono">{t.date}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`font-bold ${isRevenue ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isRevenue ? '+' : '-'}{t.amount.toLocaleString()} ر.س
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {t.is_auto ? (
          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 justify-center">
            <Lock size={10} /> تلقائي
          </span>
        ) : t.notes ? (
          <span className="text-[11px] text-muted-foreground">{t.notes}</span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {!t.is_auto && (
          <button
            type="button"
            onClick={() => onDelete(t.id)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */

export default function FinancePage() {
  const { selectedMonth } = useTemporalContext();
  const {
    loading,
    error,
    refetch,
    revenue,
    expenses,
    balance,
    revenueItems,
    expenseItems,
    createTransaction,
    deleteTransaction,
    syncSalaries,
    isSaving,
    isDeleting,
    isSyncing,
  } = useFinance();

  const [modal, setModal] = useState<{ open: boolean; type: TransactionType }>({ open: false, type: 'revenue' });

  const monthLabel = format(new Date(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ar });

  if (error && !loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <QueryErrorRetry error={error} onRetry={() => void refetch()} title="تعذر تحميل البيانات المالية" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-1">
            <span>الرئيسية</span>
            <span>/</span>
            <span className="text-muted-foreground font-medium">المصاريف والإيرادات</span>
          </nav>
          <h1 className="text-xl font-black text-foreground">المصاريف والإيرادات</h1>
          <p className="text-xs text-muted-foreground mt-0.5">إدارة الميزانية الشهرية — {monthLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 px-3 border border-border/50 text-[11px] font-bold text-muted-foreground">
            <Calendar size={13} className="me-1.5 text-primary/70" />
            <span>شهر: {monthLabel}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void syncSalaries()}
            disabled={isSyncing}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            مزامنة الرواتب
          </Button>
          <Button
            size="sm"
            onClick={() => setModal({ open: true, type: 'revenue' })}
            className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus size={14} /> إيراد
          </Button>
          <Button
            size="sm"
            onClick={() => setModal({ open: true, type: 'expense' })}
            className="gap-1.5 h-8 text-xs bg-rose-500 hover:bg-rose-600"
          >
            <Plus size={14} /> مصروف
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FinanceStatCard
          icon={<TrendingUp size={22} className="text-emerald-600" />}
          label="إجمالي الإيرادات"
          value={`${revenue.toLocaleString()} ر.س`}
          accent="bg-emerald-100 dark:bg-emerald-950/40"
          sub={`${revenueItems.length} عملية`}
        />
        <FinanceStatCard
          icon={<TrendingDown size={22} className="text-rose-500" />}
          label="إجمالي المصاريف"
          value={`${expenses.toLocaleString()} ر.س`}
          accent="bg-rose-100 dark:bg-rose-950/40"
          sub={`${expenseItems.length} عملية`}
        />
        <FinanceStatCard
          icon={<Wallet size={22} className={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'} />}
          label="الرصيد (الفرق)"
          value={`${balance >= 0 ? '+' : ''}${balance.toLocaleString()} ر.س`}
          accent={balance >= 0
            ? 'bg-emerald-100 dark:bg-emerald-950/40'
            : 'bg-rose-100 dark:bg-rose-950/40'
          }
          sub={balance >= 0 ? 'ربح' : 'خسارة'}
        />
      </div>

      {/* ── Balance Bar ───────────────────────────────────── */}
      {(revenue > 0 || expenses > 0) && (
        <div className="bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">نسبة المصاريف إلى الإيرادات</span>
            <span className="text-xs text-muted-foreground">
              {revenue > 0 ? `${((expenses / revenue) * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
          <div className="h-4 rounded-full bg-muted overflow-hidden flex">
            {revenue > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(revenue / (revenue + expenses)) * 100}%` }}
              />
            )}
            {expenses > 0 && (
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${(expenses / (revenue + expenses)) * 100}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-emerald-600 font-semibold">💰 إيرادات: {revenue.toLocaleString()}</span>
            <span className="text-rose-500 font-semibold">💸 مصاريف: {expenses.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ── Transactions Table ────────────────────────────── */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">سجل العمليات</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">كل الإيرادات والمصاريف لشهر {monthLabel}</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {revenueItems.length + expenseItems.length} عملية
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">جاري التحميل...</div>
        ) : revenueItems.length === 0 && expenseItems.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">💰</span>
            <p className="font-medium text-foreground mt-3">لا توجد عمليات مالية</p>
            <p className="text-xs text-muted-foreground mt-1">أضف إيراد أو مصروف، أو اضغط "مزامنة الرواتب"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">العملية</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">التاريخ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">المبلغ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-16">حذف</th>
                </tr>
              </thead>
              <tbody>
                {[...revenueItems, ...expenseItems]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      onDelete={(id) => void deleteTransaction(id)}
                      isDeleting={isDeleting}
                    />
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                  <td className="px-4 py-3 font-bold text-foreground" colSpan={2}>الإجمالي</td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <p className="text-emerald-600 font-bold">+{revenue.toLocaleString()} ر.س</p>
                      <p className="text-rose-500 font-bold">-{expenses.toLocaleString()} ر.س</p>
                      <p className={`font-black text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        = {balance >= 0 ? '+' : ''}{balance.toLocaleString()} ر.س
                      </p>
                    </div>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────── */}
      {modal.open && (
        <AddTransactionModal
          defaultType={modal.type}
          monthYear={selectedMonth}
          saving={isSaving}
          onSave={async (input) => { await createTransaction(input); }}
          onClose={() => setModal({ ...modal, open: false })}
        />
      )}
    </div>
  );
}
