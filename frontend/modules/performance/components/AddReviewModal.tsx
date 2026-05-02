import { useState, useEffect } from 'react';
import { Button } from '@shared/components/ui/button';
import { X, Star } from 'lucide-react';
import { hrReviewService, getOverallScore, getGrade, type HrReview, type HrReviewPayload } from '@services/hrReviewService';
import { useToast } from '@shared/hooks/use-toast';
import { useAuth } from '@app/providers/AuthContext';

interface Employee { id: string; name: string; job_title: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  monthYear: string;
  reviewedEmployeeIds: string[];
  editReview?: HrReview | null;
  onSaved: () => void;
}

const CRITERIA: { key: keyof Pick<HrReviewPayload, 'attendance_score' | 'performance_score' | 'behavior_score' | 'commitment_score'>; label: string; desc: string }[] = [
  { key: 'attendance_score',  label: 'الحضور والانتظام',    desc: 'الالتزام بالحضور في الوقت المحدد' },
  { key: 'performance_score', label: 'الأداء والإنتاجية',   desc: 'حجم الإنجاز وجودة العمل' },
  { key: 'behavior_score',    label: 'السلوك والتعامل',     desc: 'التعامل مع الزملاء والعملاء' },
  { key: 'commitment_score',  label: 'الالتزام والمسؤولية', desc: 'الالتزام بالتعليمات والمواعيد' },
];

type ScoreKey = 'attendance_score' | 'performance_score' | 'behavior_score' | 'commitment_score';

const ScoreInput = ({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) => {
  const getColor = (v: number) => v >= 8 ? 'bg-emerald-500' : v >= 6 ? 'bg-blue-500' : v >= 4 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <span className={`text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${getColor(value)}`}>{value}</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        className="w-full h-2 rounded-full accent-primary cursor-pointer"
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 ضعيف</span>
        <span>10 ممتاز</span>
      </div>
    </div>
  );
};

export const AddReviewModal = ({ open, onOpenChange, employees, monthYear, reviewedEmployeeIds, editReview, onSaved }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ employee_id: string } & Record<ScoreKey, number> & { notes: string }>({
    employee_id: '',
    attendance_score: 7,
    performance_score: 7,
    behavior_score: 7,
    commitment_score: 7,
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (editReview) {
      setForm({
        employee_id: editReview.employee_id,
        attendance_score: editReview.attendance_score,
        performance_score: editReview.performance_score,
        behavior_score: editReview.behavior_score,
        commitment_score: editReview.commitment_score,
        notes: editReview.notes ?? '',
      });
    } else {
      setForm({ employee_id: '', attendance_score: 7, performance_score: 7, behavior_score: 7, commitment_score: 7, notes: '' });
    }
  }, [open, editReview]);

  const overallScore = getOverallScore(form);
  const grade = getGrade(overallScore);
  const available = employees.filter(e => !reviewedEmployeeIds.includes(e.id) || e.id === editReview?.employee_id);
  const valid = !!form.employee_id;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload: HrReviewPayload = {
        employee_id: form.employee_id,
        month_year: monthYear,
        reviewer_id: user?.id ?? null,
        attendance_score: form.attendance_score,
        performance_score: form.performance_score,
        behavior_score: form.behavior_score,
        commitment_score: form.commitment_score,
        notes: form.notes || null,
      };
      if (editReview) {
        await hrReviewService.update(editReview.id, payload);
        toast({ title: 'تم تحديث التقييم' });
      } else {
        await hrReviewService.create(payload);
        toast({ title: 'تم حفظ التقييم' });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'خطأ', description: err instanceof Error ? err.message : 'تعذر حفظ التقييم', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false); }}
      role="button"
      tabIndex={-1}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Star size={18} /> {editReview ? 'تعديل التقييم' : 'إضافة تقييم أداء'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">الموظف <span className="text-destructive">*</span></label>
            <select
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              value={form.employee_id}
              disabled={!!editReview}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">اختر الموظف...</option>
              {available.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}{emp.job_title ? ` — ${emp.job_title}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">المتوسط الكلي</p>
            <p className={`text-3xl font-black ${grade.color}`}>{overallScore}</p>
            <p className={`text-sm font-semibold ${grade.color}`}>{grade.label}</p>
          </div>

          <div className="space-y-5">
            {CRITERIA.map(c => (
              <ScoreInput
                key={c.key}
                label={c.label}
                desc={c.desc}
                value={form[c.key]}
                onChange={v => setForm(f => ({ ...f, [c.key]: v }))}
              />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">ملاحظات (اختياري)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
              placeholder="ملاحظات إضافية حول التقييم..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border justify-end flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'جارٍ الحفظ...' : editReview ? 'حفظ التعديلات' : 'حفظ التقييم'}
          </Button>
        </div>
      </div>
    </div>
  );
};
