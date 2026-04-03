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
  AccountDialogForm,
  PlatformAccountView,
  PlatformAppOption,
  PlatformEmployeeOption,
} from '@modules/platform-accounts/types';

interface PlatformAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAccount: PlatformAccountView | null;
  accountForm: AccountDialogForm;
  setAccountForm: Dispatch<SetStateAction<AccountDialogForm>>;
  savingAccount: boolean;
  onSave: () => Promise<void> | void;
  apps: PlatformAppOption[];
  employeesFull: PlatformEmployeeOption[];
  accountEmployeeSelectValue: string;
  accountEmployeeOrphan: boolean;
  applyEmployeeToAccountForm: (employeeId: string | null) => void;
}

export const PlatformAccountDialog = ({
  open,
  onOpenChange,
  editingAccount,
  accountForm,
  setAccountForm,
  savingAccount,
  onSave,
  apps,
  employeesFull,
  accountEmployeeSelectValue,
  accountEmployeeOrphan,
  applyEmployeeToAccountForm,
}: PlatformAccountDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg flex flex-col max-h-[min(90vh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
        dir="rtl"
      >
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-2 shrink-0 pr-14 text-right">
          <DialogTitle>{editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            بيانات الحساب على المنصة ثابتة (اسم صاحب الحساب، الإقامة المسجلة على الحساب).
            المندوب الحالي يُدار من «تعيين» أو يظهر من آخر تعيين نشط، ويمكن أن يتعاقب عدة
            مناديب على نفس الحساب خلال الشهر.
          </p>

          <div className="space-y-1.5">
            <Label>المنصة</Label>
            <Select
              value={accountForm.app_id}
              onValueChange={(value) =>
                setAccountForm((current) => ({ ...current, app_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المنصة" />
              </SelectTrigger>
              <SelectContent>
                {apps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-semibold text-foreground">بيانات الحساب على المنصة</p>
            <div className="space-y-1.5">
              <Label>صاحب الحساب (من الموظفين)</Label>
              <p className="text-[11px] text-muted-foreground">
                عند الاختيار يُعبّأ تلقائيًا <strong>رقم الإقامة</strong> و
                <strong>تاريخ انتهاء الإقامة</strong> من ملف الموظف؛ يمكنك تعديلهما أدناه إذا
                اختلفت بيانات المنصة. (اختياري — يمكن تركه فارغًا)
              </p>
              <Select
                value={accountEmployeeSelectValue}
                onValueChange={(value) => {
                  const employeeId = value === '__none__' ? null : value;
                  applyEmployeeToAccountForm(employeeId);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={editingAccount ? '- بدون ربط -' : 'اختر الموظف'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {editingAccount ? '- بدون ربط (سجل قديم) -' : '- اختر -'}
                  </SelectItem>
                  {accountEmployeeOrphan && accountForm.employee_id && (
                    <SelectItem value={accountForm.employee_id}>
                      {accountForm.account_username?.trim() || 'موظف مرتبط (غير في القائمة)'}
                    </SelectItem>
                  )}
                  {employeesFull.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {editingAccount && !accountForm.employee_id && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground">
                    اسم صاحب الحساب (يدوي - سجلات قديمة)
                  </Label>
                  <Input
                    value={accountForm.account_username}
                    onChange={(event) =>
                      setAccountForm((current) => ({
                        ...current,
                        account_username: event.target.value,
                      }))
                    }
                    placeholder="اسم المستخدم / صاحب الحساب"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>رقم الحساب (ID على المنصة)</Label>
                <Input
                  value={accountForm.account_id_on_platform}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      account_id_on_platform: event.target.value,
                    }))
                  }
                  placeholder="رقم الحساب"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-semibold text-foreground">
              بيانات الإقامة المسجلة على الحساب
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الإقامة</Label>
                <Input
                  value={accountForm.iqama_number}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      iqama_number: event.target.value,
                    }))
                  }
                  placeholder="1xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ انتهاء الإقامة</Label>
                <Input
                  type="date"
                  value={accountForm.iqama_expiry_date}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      iqama_expiry_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={accountForm.status}
              onValueChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  status: value as 'active' | 'inactive',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              value={accountForm.notes}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="ملاحظات اختيارية..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2 bg-muted/30 sm:justify-start">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={savingAccount}
            className="gap-2"
          >
            {savingAccount && <Loader2 size={14} className="animate-spin" />}
            {editingAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
