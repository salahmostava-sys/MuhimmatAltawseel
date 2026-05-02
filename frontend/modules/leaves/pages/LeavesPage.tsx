import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, PlusCircle, CheckCircle2, XCircle, Clock, Trash2, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useToast } from '@shared/hooks/use-toast';
import { useAuth } from '@app/providers/AuthContext';
import { leaveService, leaveTypeLabel, leaveStatusLabel, type LeaveRequest, type LeaveStatus } from '@services/leaveService';
import { AddLeaveModal } from '../components/AddLeaveModal';

const statusBadge: Record<LeaveStatus, string> = {
  pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const LeavesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('leaves');
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaves', uid],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [leaves, employees] = await Promise.all([
        leaveService.getAll(),
        leaveService.getEmployees(),
      ]);
      return { leaves, employees };
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['leaves', uid] });

  const leaves = data?.leaves ?? [];
  const employees = data?.employees ?? [];

  const filtered = leaves.filter(l => {
    const name = l.employees?.name?.toLowerCase() ?? '';
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchType   = typeFilter === 'all' || l.type === typeFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total:    leaves.length,
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  const handleAction = async (id: string, status: LeaveStatus) => {
    setActioningId(id);
    try {
      await leaveService.updateStatus(id, status, user?.id ?? null);
      toast({ title: status === 'approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض طلب الإجازة' });
      void refetch();
    } catch (err) {
      toast({ title: 'خطأ', description: err instanceof Error ? err.message : 'تعذر تحديث الحالة', variant: 'destructive' });
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف طلب الإجازة هذا؟')) return;
    try {
      await leaveService.delete(id);
      toast({ title: 'تم حذف الطلب' });
      void refetch();
    } catch (err) {
      toast({ title: 'خطأ', description: err instanceof Error ? err.message : 'تعذر الحذف', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="page-breadcrumb"><span>الرئيسية</span><span className="page-breadcrumb-sep">/</span><span>إدارة الإجازات</span></nav>
          <h1 className="page-title flex items-center gap-2"><CalendarDays size={20} /> إدارة الإجازات</h1>
        </div>
        {permissions.can_edit && (
          <Button size="sm" className="gap-2 h-9" onClick={() => setShowAdd(true)}>
            <PlusCircle size={15} /> طلب إجازة جديد
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الطلبات',       value: stats.total,    color: 'text-primary' },
          { label: 'بانتظار الموافقة',     value: stats.pending,  color: 'text-yellow-600' },
          { label: 'موافق عليها',          value: stats.approved, color: 'text-emerald-600' },
          { label: 'مرفوضة',              value: stats.rejected,  color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث باسم الموظف..."
            className="w-full h-9 rounded-lg border border-border bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">كل الأنواع</option>
          <option value="annual">سنوية</option>
          <option value="sick">مرضية</option>
          <option value="emergency">طارئة</option>
          <option value="unpaid">بدون راتب</option>
          <option value="other">أخرى</option>
        </select>
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="pending">بانتظار الموافقة</option>
          <option value="approved">موافق عليها</option>
          <option value="rejected">مرفوضة</option>
        </select>
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center text-sm text-destructive">
          تعذر تحميل البيانات — تأكد من تشغيل الـ SQL في Supabase أولاً
        </div>
      ) : isLoading ? (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-muted-foreground text-sm animate-pulse">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center">
          <CalendarDays size={32} className="mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات إجازة{search ? ' تطابق البحث' : ''}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['الموظف', 'نوع الإجازة', 'من', 'إلى', 'الأيام', 'السبب', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((leave: LeaveRequest) => (
                  <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{leave.employees?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{leaveTypeLabel[leave.type]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{leave.start_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{leave.end_date}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{leave.days_count}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{leave.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[leave.status]}`}>
                        {leave.status === 'pending'  && <Clock size={11} />}
                        {leave.status === 'approved' && <CheckCircle2 size={11} />}
                        {leave.status === 'rejected' && <XCircle size={11} />}
                        {leaveStatusLabel[leave.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {permissions.can_edit && leave.status === 'pending' && (
                          <>
                            <button
                              disabled={actioningId === leave.id}
                              onClick={() => void handleAction(leave.id, 'approved')}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                              title="موافقة"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              disabled={actioningId === leave.id}
                              onClick={() => void handleAction(leave.id, 'rejected')}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                              title="رفض"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {permissions.can_delete && (
                          <button
                            onClick={() => void handleDelete(leave.id)}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            {filtered.length} طلب {filtered.length !== leaves.length ? `من أصل ${leaves.length}` : ''}
          </div>
        </div>
      )}

      <AddLeaveModal
        open={showAdd}
        onOpenChange={setShowAdd}
        employees={employees}
        onSaved={refetch}
      />
    </div>
  );
};

export default LeavesPage;
