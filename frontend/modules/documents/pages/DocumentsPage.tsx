import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { supabase } from '@services/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

interface EmployeeDoc {
  id: string;
  name: string;
  job_title: string | null;
  status: string;
  residency_expiry: string | null;
  probation_end_date: string | null;
  health_insurance_expiry: string | null;
  license_expiry: string | null;
}

type DocStatus = 'expired' | 'urgent' | 'warning' | 'ok' | 'missing';

const today = new Date();
today.setHours(0, 0, 0, 0);

const getDocStatus = (dateStr: string | null): { status: DocStatus; daysLeft: number | null } => {
  if (!dateStr) return { status: 'missing', daysLeft: null };
  const d = differenceInDays(parseISO(dateStr), today);
  if (d < 0)  return { status: 'expired', daysLeft: d };
  if (d <= 7)  return { status: 'urgent',  daysLeft: d };
  if (d <= 30) return { status: 'warning', daysLeft: d };
  return { status: 'ok', daysLeft: d };
};

const statusConfig: Record<DocStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  expired: { label: 'منتهي',      cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',         icon: <XCircle size={11} /> },
  urgent:  { label: 'عاجل',       cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: <AlertTriangle size={11} /> },
  warning: { label: 'قريب',       cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock size={11} /> },
  ok:      { label: 'سليم',       cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 size={11} /> },
  missing: { label: 'غير مسجل',  cls: 'bg-muted text-muted-foreground',                                         icon: null },
};

const DocCell = ({ dateStr }: { dateStr: string | null }) => {
  const { status, daysLeft } = getDocStatus(dateStr);
  const cfg = statusConfig[status];
  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
        {cfg.icon}{cfg.label}
      </span>
      {dateStr && (
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      )}
      {daysLeft !== null && status !== 'ok' && status !== 'missing' && (
        <p className={`text-xs font-semibold ${status === 'expired' ? 'text-red-600' : status === 'urgent' ? 'text-orange-600' : 'text-yellow-600'}`}>
          {daysLeft < 0 ? `منذ ${Math.abs(daysLeft)} يوم` : daysLeft === 0 ? 'اليوم' : `${daysLeft} يوم`}
        </p>
      )}
    </div>
  );
};

type FilterStatus = 'all' | 'expired' | 'urgent' | 'warning';

const DOC_KEYS: Array<keyof Pick<EmployeeDoc, 'residency_expiry' | 'health_insurance_expiry' | 'license_expiry' | 'probation_end_date'>> = [
  'residency_expiry', 'health_insurance_expiry', 'license_expiry', 'probation_end_date'
];

const DocumentsPage = () => {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['documents-employees', uid],
    enabled,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, job_title, status, residency_expiry, probation_end_date, health_insurance_expiry, license_expiry')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return (data ?? []) as EmployeeDoc[];
    },
  });

  const needsAttention = (emp: EmployeeDoc) =>
    DOC_KEYS.some(k => {
      const s = getDocStatus(emp[k]).status;
      return s === 'expired' || s === 'urgent' || s === 'warning';
    });

  const hasStatus = (emp: EmployeeDoc, target: DocStatus) =>
    DOC_KEYS.some(k => getDocStatus(emp[k]).status === target);

  const filtered = employees.filter(emp => {
    const matchSearch = !search || emp.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all'     ? true :
      filterStatus === 'expired' ? hasStatus(emp, 'expired') :
      filterStatus === 'urgent'  ? hasStatus(emp, 'urgent') :
      filterStatus === 'warning' ? needsAttention(emp) : true;
    return matchSearch && matchStatus;
  });

  const stats = {
    expired:  employees.filter(e => hasStatus(e, 'expired')).length,
    urgent:   employees.filter(e => hasStatus(e, 'urgent')).length,
    warning:  employees.filter(e => needsAttention(e)).length,
    ok:       employees.filter(e => !needsAttention(e)).length,
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <nav className="page-breadcrumb"><span>الرئيسية</span><span className="page-breadcrumb-sep">/</span><span>متابعة الوثائق</span></nav>
        <h1 className="page-title flex items-center gap-2"><FileText size={20} /> متابعة وثائق الموظفين</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'وثائق منتهية',     value: stats.expired, color: 'text-red-600',     active: filterStatus === 'expired', key: 'expired' as FilterStatus },
          { label: 'تنتهي خلال أسبوع', value: stats.urgent,  color: 'text-orange-600',  active: filterStatus === 'urgent',  key: 'urgent'  as FilterStatus },
          { label: 'تنتهي خلال شهر',  value: stats.warning, color: 'text-yellow-600',   active: filterStatus === 'warning', key: 'warning' as FilterStatus },
          { label: 'وثائق سليمة',      value: stats.ok,      color: 'text-emerald-600',  active: filterStatus === 'all',    key: 'all'     as FilterStatus },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.active ? 'all' : s.key)}
            className={`bg-card rounded-xl border p-4 text-right transition-colors hover:border-primary/40 ${s.active ? 'border-primary' : 'border-border/50'}`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث باسم الموظف..."
          className="w-full h-9 rounded-lg border border-border bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center text-sm text-destructive">
          تعذر تحميل البيانات
        </div>
      ) : isLoading ? (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-muted-foreground text-sm animate-pulse">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">لا يوجد موظفون{search ? ' يطابقون البحث' : ''}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['الموظف', 'الإقامة / الهوية', 'التأمين الصحي', 'رخصة القيادة', 'فترة التجربة'].map(h => (
                    <th key={h} className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{emp.name}</p>
                      {emp.job_title && <p className="text-xs text-muted-foreground">{emp.job_title}</p>}
                    </td>
                    <td className="px-4 py-3"><DocCell dateStr={emp.residency_expiry} /></td>
                    <td className="px-4 py-3"><DocCell dateStr={emp.health_insurance_expiry} /></td>
                    <td className="px-4 py-3"><DocCell dateStr={emp.license_expiry} /></td>
                    <td className="px-4 py-3"><DocCell dateStr={emp.probation_end_date} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            {filtered.length} موظف {filtered.length !== employees.length ? `من أصل ${employees.length}` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
