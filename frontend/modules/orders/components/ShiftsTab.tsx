import { useState, useMemo } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { OrdersMonthNavigator } from '@shared/components/orders/OrdersMonthNavigator';
import { monthLabel } from '@modules/orders/utils/dateMonth';
import type { App, Employee } from '@modules/orders/types';

export type ShiftRow = {
  id?: string;
  employee_id: string;
  app_id: string;
  date: string;
  hours_worked: number;
  employee?: { name: string };
  app?: { name: string };
};

type Props = {
  year: number;
  month: number;
  shifts: ShiftRow[];
  employees: Employee[];
  apps: App[];
  loading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSave: (shifts: ShiftRow[]) => Promise<void>;
  canEdit: boolean;
};

export function ShiftsTab({
  year,
  month,
  shifts,
  employees,
  apps,
  loading,
  onPrevMonth,
  onNextMonth,
  onSave,
  canEdit,
}: Props) {
  const [localShifts, setLocalShifts] = useState<ShiftRow[]>(shifts);
  const [saving, setSaving] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [appFilter, setAppFilter] = useState<string>('all');

  const shiftApps = useMemo(() => apps.filter((a) => a.work_type === 'shift' || a.work_type === 'hybrid'), [apps]);

  const filteredShifts = useMemo(() => {
    return localShifts.filter((s) => {
      if (employeeFilter !== 'all' && s.employee_id !== employeeFilter) return false;
      if (appFilter !== 'all' && s.app_id !== appFilter) return false;
      return true;
    });
  }, [localShifts, employeeFilter, appFilter]);

  const handleAddRow = () => {
    const newRow: ShiftRow = {
      employee_id: employees[0]?.id || '',
      app_id: shiftApps[0]?.id || '',
      date: `${year}-${String(month).padStart(2, '0')}-01`,
      hours_worked: 0,
    };
    setLocalShifts([...localShifts, newRow]);
  };

  const handleUpdateRow = (index: number, field: keyof ShiftRow, value: string | number) => {
    const updated = [...localShifts];
    updated[index] = { ...updated[index], [field]: value };
    setLocalShifts(updated);
  };

  const handleDeleteRow = (index: number) => {
    setLocalShifts(localShifts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localShifts);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <OrdersMonthNavigator
          compact
          label={monthLabel(year, month)}
          onPrev={onPrevMonth}
          onNext={onNextMonth}
        />

        <div className="flex items-center gap-2">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="كل الموظفين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الموظفين</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="كل المنصات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المنصات</SelectItem>
              {shiftApps.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleAddRow}>
              <Plus size={14} className="ml-1" />
              إضافة سطر
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin ml-1" />}
              حفظ
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">#</TableHead>
              <TableHead className="text-right">الموظف</TableHead>
              <TableHead className="text-right">المنصة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">ساعات العمل</TableHead>
              {canEdit && <TableHead className="text-right">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                  <Loader2 className="animate-spin size-6 mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredShifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات دوام
                </TableCell>
              </TableRow>
            ) : (
              filteredShifts.map((shift, idx) => (
                <TableRow key={shift.id || idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={shift.employee_id}
                        onValueChange={(v) => handleUpdateRow(idx, 'employee_id', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      shift.employee?.name || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={shift.app_id} onValueChange={(v) => handleUpdateRow(idx, 'app_id', v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shiftApps.map((app) => (
                            <SelectItem key={app.id} value={app.id}>
                              {app.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      shift.app?.name || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="date"
                        value={shift.date}
                        onChange={(e) => handleUpdateRow(idx, 'date', e.target.value)}
                      />
                    ) : (
                      shift.date
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={shift.hours_worked}
                        onChange={(e) => handleUpdateRow(idx, 'hours_worked', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      shift.hours_worked
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRow(idx)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
