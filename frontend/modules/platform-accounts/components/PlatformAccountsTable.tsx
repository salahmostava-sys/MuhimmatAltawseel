import { Edit, History, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { ColorBadge } from '@shared/components/ui/ColorBadge';
import { sortArrowGlyph } from '@shared/lib/sortTableIndicators';
import { getIqamaBadge } from '@modules/platform-accounts/lib/platformAccountsModel';
import type {
  PlatformAccountView,
  SortDir,
  SortKey,
} from '@modules/platform-accounts/types';

interface PlatformAccountsTableProps {
  loading: boolean;
  accountsCount: number;
  accounts: PlatformAccountView[];
  alertDays: number;
  sortKey: SortKey;
  sortDir: SortDir;
  canEdit: boolean;
  onToggleSort: (key: SortKey) => void;
  onOpenHistory: (account: PlatformAccountView) => void;
  onOpenAssign: (account: PlatformAccountView) => void;
  onOpenEdit: (account: PlatformAccountView) => void;
}

export const PlatformAccountsTable = ({
  loading,
  accountsCount,
  accounts,
  alertDays,
  sortKey,
  sortDir,
  canEdit,
  onToggleSort,
  onOpenHistory,
  onOpenAssign,
  onOpenEdit,
}: PlatformAccountsTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="ds-card p-12 text-center text-muted-foreground">
        <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">لا توجد حسابات</p>
        <p className="text-sm mt-1">
          {accountsCount === 0
            ? 'أضف حسابات المنصات من زر "إضافة حساب"'
            : 'غيّر البحث أو فلتر المنصة/الحالة'}
        </p>
      </div>
    );
  }

  return (
    <div className="ds-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('account_username')}
              >
                اسم الحساب {sortArrowGlyph(sortKey, 'account_username', sortDir)}
              </th>
              <th className="text-center font-semibold px-4 py-3 select-none">المنصة</th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('account_id_on_platform')}
              >
                رقم الحساب {sortArrowGlyph(sortKey, 'account_id_on_platform', sortDir)}
              </th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('iqama_number')}
              >
                رقم الإقامة {sortArrowGlyph(sortKey, 'iqama_number', sortDir)}
              </th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('iqama_expiry_date')}
              >
                انتهاء الإقامة {sortArrowGlyph(sortKey, 'iqama_expiry_date', sortDir)}
              </th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('current_employee')}
              >
                المندوب الحالي {sortArrowGlyph(sortKey, 'current_employee', sortDir)}
              </th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none max-w-[7rem]"
                onClick={() => onToggleSort('assignments_month')}
                title="عدد مرات تسجيل التعيين على الشهر الحالي (تعاقب عدة مناديب)"
              >
                تعيينات الشهر {sortArrowGlyph(sortKey, 'assignments_month', sortDir)}
              </th>
              <th
                className="text-center font-semibold px-4 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('status')}
              >
                الحالة {sortArrowGlyph(sortKey, 'status', sortDir)}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((account) => {
              const badge = getIqamaBadge(account.iqama_expiry_date, alertDays);
              return (
                <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold">{account.account_username}</td>
                  <td className="px-4 py-3">
                    <ColorBadge
                      label={account.app_name ?? '-'}
                      bg={account.app_color ?? '#6366f1'}
                      fg={account.app_text_color ?? '#ffffff'}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {account.account_id_on_platform ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{account.iqama_number ?? '-'}</td>
                  <td className="px-4 py-3">
                    {badge ? (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {account.current_employee ? (
                      <span className="text-xs font-medium text-foreground">
                        {account.current_employee.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">لا يوجد</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        (account.assignments_this_month_count ?? 0) > 1
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                      title="عدد سجلات التعيين المسجلة لهذا الشهر (شهر واحد قد يشمل عدة مناديب بالتتابع)"
                    >
                      {account.assignments_this_month_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        account.status === 'active'
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {account.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1 text-xs text-primary"
                        onClick={() => onOpenHistory(account)}
                        title="السجل التاريخي"
                      >
                        <History size={13} />
                        السجل
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => onOpenAssign(account)}
                            title="تعيين مندوب"
                          >
                            <UserPlus size={13} />
                            تعيين
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => onOpenEdit(account)}
                          >
                            <Edit size={13} />
                            تعديل
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
  );
};
