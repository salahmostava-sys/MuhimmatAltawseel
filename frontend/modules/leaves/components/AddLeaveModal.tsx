import { useState, useEffect } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Button } from '@shared/components/ui/button';
import { X, CalendarDays } from 'lucide-react';
import { leaveService, leaveTypeLabel, type LeaveType, type LeaveCreatePayload } from '@services/leaveService';
import { useToast } from '@shared/hooks/use-toast';
import { useAuth } from '@app/providers/AuthContext';

interface Employee { id: string; name: string; job_title: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  onSaved: () => void;
}

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'emergency', 'unpaid', 'other'];

export const AddLeaveModal = ({ open, onOpenChange, employees, onSaved }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: 'annual' as LeaveType,
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    if (open) setForm({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '' });
  }, [open]);

  const daysCount = form.start_date && form.end_date
    ? Math.max(1, differenceInCalendarDays(parseISO(form.end_date), parseISO(form.start_date)) + 1)
    : 0;

  const valid = form.employee_id && form.start_date && form.end_date && form.end_date >= form.start_date;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload: LeaveCreatePayload = {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        days_count: daysCount,
        reason: form.reason || null,
        created_by: user?.id ?? null,
      };
      await leaveService.create(payload);
      toast({ title: 'تم إضافة طلب الإجازة', variant: 'default' });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'خطأ', description: err instanceof Error ? err.message : 'تعذر حفظ الطلب', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false); }}
      role="button"
      tabIndex={-1}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><CalendarDays size={18} /> إضافة طلب إجازة</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">الموظف <span className="text-destructive">*</span></label>
            <select
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">اختر الموظف...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}{emp.job_title ? ` — ${emp.job_title}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">نوع الإجازة <span className="text-destructive">*</span></label>
            <select
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as LeaveType }))}
            >
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{leaveTypeLabel[t]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">من تاريخ <span className="text-destructive">*</span></label>
              <input
                type="date"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">إلى تاريخ <span className="text-destructive">*</span></label>
              <input
                type="date"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.end_date}
                min={form.start_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          {daysCount > 0 && (
            <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
              <span className="text-sm font-semibold text-primary">المدة: {daysCount} {daysCount === 1 ? 'يوم' : 'أيام'}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">السبب (اختياري)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
              placeholder="سبب الإجازة..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
          </Button>
        </div>
      </div>
    </div>
  );
};
