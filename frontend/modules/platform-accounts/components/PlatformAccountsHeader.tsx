import { Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface PlatformAccountsHeaderProps {
  loading: boolean;
  accountsCount: number;
  activeCount: number;
  warnCount: number;
  canEdit: boolean;
  onAddAccount: () => void;
}

export const PlatformAccountsHeader = ({
  loading,
  accountsCount,
  activeCount,
  warnCount,
  canEdit,
  onAddAccount,
}: PlatformAccountsHeaderProps) => {
  return (
    <div className="page-header">
      <nav className="page-breadcrumb">
        <span>الرئيسية</span>
        <span className="page-breadcrumb-sep">/</span>
        <span>حسابات المنصات</span>
      </nav>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck size={20} />
            حسابات المنصات
          </h1>
          <p className="page-subtitle">
            {loading ? 'جارٍ التحميل...' : `${accountsCount} حساب - ${activeCount} نشط`}
            {warnCount > 0 && (
              <span className="text-destructive ms-2 font-semibold">
                · {warnCount} إقامة تحتاج متابعة
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-2" onClick={onAddAccount}>
            <Plus size={15} />
            إضافة حساب
          </Button>
        )}
      </div>
    </div>
  );
};
