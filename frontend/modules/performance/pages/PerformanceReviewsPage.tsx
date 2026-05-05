import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, PlusCircle, Pencil, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useToast } from '@shared/hooks/use-toast';
import { hrReviewService, getOverallScore, getGrade, type HrReview } from '@services/hrReviewService';
import { AddReviewModal } from '../components/AddReviewModal';
import { format, addMonths, subMonths, parseISO } from 'date-fns';

const toMonthYear = (d: Date) => format(d, 'yyyy-MM');
const toDisplayMonth = (my: string) => {
  const d = parseISO(`${my}-01`);
  return format(d, 'MMMM yyyy');
};

function getScoreColor(value: number): string {
  if (value >= 8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (value >= 6) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (value >= 4) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

const ScorePill = ({ value }: Readonly<{ value: number }>) => {
  const color = getScoreColor(value);
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
};

const PerformanceReviewsPage = () => {
  const { toast } = useToast();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('performance_reviews');
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const monthYear = toMonthYear(currentDate);

  const [showAdd, setShowAdd] = useState(false);
  const [editReview, setEditReview] = useState<HrReview | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['hr-reviews', uid, monthYear],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [reviews, employees] = await Promise.all([
        hrReviewService.getByMonth(monthYear),
        hrReviewService.getEmployees(),
      ]);
      return { reviews, employees };
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['hr-reviews', uid, monthYear] });

  const reviews = data?.reviews ?? [];
  const employees = data?.employees ?? [];
  const reviewedIds = reviews.map(r => r.employee_id);

  const overalls = reviews.map(r => getOverallScore(r));
  const avgScore = overalls.length ? Number.parseFloat((overalls.reduce((a, b) => a + b, 0) / overalls.length).toFixed(1)) : 0;
  const excellent = overalls.filter(s => s >= 9).length;
  const weak      = overalls.filter(s => s < 5).length;

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التقييم؟')) return;
    setDeletingId(id);
    try {
      await hrReviewService.delete(id);
      toast({ title: 'تم حذف التقييم' });
      refetch();
    } catch (err) {
      toast({ title: 'خطأ', description: err instanceof Error ? err.message : 'تعذر الحذف', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="page-breadcrumb"><span>الرئيسية</span><span className="page-breadcrumb-sep">/</span><span>تقييم الأداء</span></nav>
          <h1 className="page-title flex items-center gap-2"><Star size={20} /> تقييم الأداء الشهري</h1>
        </div>
        {permissions.can_edit && (
          <Button size="sm" className="gap-2 h-9" onClick={() => { setEditReview(null); setShowAdd(true); }}>
            <PlusCircle size={15} /> إضافة تقييم
          </Button>
        )}
      </div>

      {/* Month Picker */}
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"><ChevronRight size={16} /></button>
        <span className="text-base font-semibold text-foreground min-w-[160px] text-center">{toDisplayMonth(monthYear)}</span>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"><ChevronLeft size={16} /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'عدد التقييمات',    value: reviews.length, color: 'text-primary' },
          { label: 'متوسط التقييم',    value: avgScore || '—',  color: 'text-blue-600' },
          { label: 'تقييمات ممتازة',   value: excellent,       color: 'text-emerald-600' },
          { label: 'تقييمات ضعيفة',    value: weak,            color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center text-sm text-destructive">
          تعذر تحميل البيانات — تأكد من تشغيل الـ SQL في Supabase أولاً
        </div>
      )}
      {!error && isLoading && (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-muted-foreground text-sm animate-pulse">جارٍ التحميل...</div>
      )}
      {!error && !isLoading && reviews.length === 0 && (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center">
          <Star size={32} className="mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-3">لا توجد تقييمات لهذا الشهر</p>
          {permissions.can_edit && (
            <Button size="sm" onClick={() => { setEditReview(null); setShowAdd(true); }}>
              <PlusCircle size={14} className="ml-1" /> ابدأ التقييم
            </Button>
          )}
        </div>
      )}
      {!error && !isLoading && reviews.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['الموظف', 'الحضور', 'الأداء', 'السلوك', 'الالتزام', 'المجموع', 'التقدير', 'ملاحظات', 'إجراءات'].map(h => (
                    <th key={h} className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {reviews.map((review: HrReview) => {
                  const overall = getOverallScore(review);
                  const grade   = getGrade(overall);
                  return (
                    <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{review.employees?.name ?? '—'}</p>
                        {review.employees?.job_title && <p className="text-xs text-muted-foreground">{review.employees.job_title}</p>}
                      </td>
                      <td className="px-4 py-3"><ScorePill value={review.attendance_score} /></td>
                      <td className="px-4 py-3"><ScorePill value={review.performance_score} /></td>
                      <td className="px-4 py-3"><ScorePill value={review.behavior_score} /></td>
                      <td className="px-4 py-3"><ScorePill value={review.commitment_score} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-base font-black ${grade.color}`}>{overall}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${grade.color}`}>{grade.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[140px] truncate">{review.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {permissions.can_edit && (
                            <button
                              onClick={() => { setEditReview(review); setShowAdd(true); }}
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="تعديل"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {permissions.can_delete && (
                            <button
                              disabled={deletingId === review.id}
                              onClick={() => { handleDelete(review.id); }}
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                              title="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            {reviews.length} تقييم لشهر {toDisplayMonth(monthYear)}
          </div>
        </div>
      )}

      <AddReviewModal
        open={showAdd}
        onOpenChange={v => { setShowAdd(v); if (!v) setEditReview(null); }}
        employees={employees}
        monthYear={monthYear}
        reviewedEmployeeIds={reviewedIds}
        editReview={editReview}
        onSaved={refetch}
      />
    </div>
  );
};

export default PerformanceReviewsPage;
