import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import type { App, Employee } from '@modules/orders/types';

type DeleteScope = 'employee_month' | 'employee_app_month' | 'app_month' | 'day';

type Props = Readonly<{
  open: boolean;
  employees: Employee[];
  apps: App[];
  year: number;
  month: number;
  onConfirm: (scope: DeleteScope, filters: {
    employeeId?: string;
    appId?: string;
    day?: number;
  }) => Promise<void>;
  onCancel: () => void;
}>;

type DeleteFilters = Parameters<Props['onConfirm']>[1];

export function BulkDeleteOrdersDialog({ open, employees, apps, year, month, onConfirm, onCancel }: Props) {
  const [scope, setScope] = useState<DeleteScope>('employee_month');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [appId, setAppId] = useState<string>('');
  const [day, setDay] = useState<number>(1);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      const filters: DeleteFilters = {};
      
      if (scope === 'employee_month') {
        filters.employeeId = employeeId;
      } else if (scope === 'employee_app_month') {
        filters.employeeId = employeeId;
        filters.appId = appId;
      } else if (scope === 'app_month') {
        filters.appId = appId;
      } else if (scope === 'day') {
        filters.day = day;
      }
      
      await onConfirm(scope, filters);
      onCancel();
    } finally {
      setDeleting(false);
    }
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 size={18} />
            حذف طلبات بشكل جماعي
          </DialogTitle>
          <DialogDescription>
            اختر نطاق الحذف. هذا الإجراء لا يمكن التراجع عنه!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as DeleteScope)}>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="employee_month" id="employee_month" />
              <Label htmlFor="employee_month" className="cursor-pointer font-normal">
                حذف كل طلبات موظف في الشهر
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="employee_app_month" id="employee_app_month" />
              <Label htmlFor="employee_app_month" className="cursor-pointer font-normal">
                حذف طلبات موظف على منصة معينة في الشهر
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="app_month" id="app_month" />
              <Label htmlFor="app_month" className="cursor-pointer font-normal">
                حذف كل طلبات منصة في الشهر
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="day" id="day" />
              <Label htmlFor="day" className="cursor-pointer font-normal">
                حذف كل طلبات يوم معين
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-3 border-t pt-4">
            {(scope === 'employee_month' || scope === 'employee_app_month') && (
              <div className="space-y-2">
                <Label>الموظف</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(scope === 'employee_app_month' || scope === 'app_month') && (
              <div className="space-y-2">
                <Label>المنصة</Label>
                <Select value={appId} onValueChange={setAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر منصة" />
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
            )}

            {scope === 'day' && (
              <div className="space-y-2">
                <Label>اليوم</Label>
                <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-destructive font-medium">
              ⚠️ تحذير: سيتم حذف الطلبات نهائياً ولا يمكن استرجاعها
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting || 
              (scope === 'employee_month' && !employeeId) ||
              (scope === 'employee_app_month' && (!employeeId || !appId)) ||
              (scope === 'app_month' && !appId)
            }
          >
            {deleting && <Loader2 className="animate-spin size-4 ml-2" />}
            حذف نهائي
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
