import type { Dispatch, SetStateAction } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Textarea } from '@shared/components/ui/textarea';
import type {
  AssignDialogForm,
  AssignmentEmployeePreview,
  PlatformAccountView,
  PlatformEmployeeOption,
} from '@modules/platform-accounts/types';

interface PlatformAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignTarget: PlatformAccountView | null;
  assignForm: AssignDialogForm;
  setAssignForm: Dispatch<SetStateAction<AssignDialogForm>>;
  savingAssign: boolean;
  onSave: () => Promise<void> | void;
  employees: PlatformEmployeeOption[];
  selectedEmployeePreview: AssignmentEmployeePreview;
}

export const PlatformAssignDialog = ({
  open,
  onOpenChange,
  assignTarget,
  assignForm,
  setAssignForm,
  savingAssign,
  onSave,
  employees,
  selectedEmployeePreview,
}: PlatformAssignDialogProps) => {
  const hasSelectedEmployeePreview =
    Boolean(selectedEmployeePreview.nationalId) ||
    Boolean(selectedEmployeePreview.residencyExpiryLabel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعيين مندوب - {assignTarget?.account_username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            نفس الحساب قد يعمل عليه <span className="font-semibold text-foreground">عدة مناديب خلال الشهر</span>
            {' '}بالتتابع: كل تعيين جديد يُغلق التعيين السابق ويُفتح سجل جديد. يظهر في الجدول
            عمود «تعيينات الشهر» لعدد مرات التسجيل في الشهر الحالي.
          </p>

          {assignTarget?.current_employee && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 text-sm">
              <span className="font-medium">المندوب الحالي:</span>
              <span>{assignTarget.current_employee.name}</span>
              <span className="text-amber-600 text-xs ms-auto">
                سيتم إغلاق تعيينه تلقائيًا
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>المندوب الجديد</Label>
            <Select
              value={assignForm.employee_id}
              onValueChange={(value) =>
                setAssignForm((current) => ({ ...current, employee_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المندوب" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasSelectedEmployeePreview && (
              <p className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                {selectedEmployeePreview.nationalId && (
                  <span className="block">
                    رقم الإقامة في ملف الموظف:
                    <span className="font-mono dir-ltr inline-block ms-1">
                      {selectedEmployeePreview.nationalId}
                    </span>
                  </span>
                )}
                {selectedEmployeePreview.residencyExpiryLabel && (
                  <span className="block">
                    انتهاء الإقامة (ملف الموظف):
                    <span className="font-medium ms-1">
                      {selectedEmployeePreview.residencyExpiryLabel}
                    </span>
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>تاريخ البداية</Label>
            <Input
              type="date"
              value={assignForm.start_date}
              onChange={(event) =>
                setAssignForm((current) => ({ ...current, start_date: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              value={assignForm.notes}
              onChange={(event) =>
                setAssignForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="ملاحظات اختيارية..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={() => { onSave(); }} disabled={savingAssign} className="gap-2">
            {savingAssign && <Loader2 size={14} className="animate-spin" />}
            تعيين المندوب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
