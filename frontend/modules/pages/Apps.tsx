import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDate, getDaysInMonth, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Smartphone, Plus, Edit2, Power, PowerOff, X, Check, Trash2, PlusCircle, Columns, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { Switch } from '@shared/components/ui/switch';
import { Label } from '@shared/components/ui/label';
import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC, TOAST_SUCCESS_ACTION, TOAST_SUCCESS_ADD, TOAST_SUCCESS_EDIT } from '@shared/lib/toastMessages';
import { invalidateAppColorsCache } from '@shared/hooks/useAppColors';
import { usePermissions } from '@shared/hooks/usePermissions';
import { appService } from '@services/appService';
import { useTemporalContext } from '@app/providers/TemporalContext';
import { PageSection } from '@shared/components/layout/PageScaffold';
import { dashboardService } from '@services/dashboardService';
import type { Json } from '@services/supabase/types';

interface CustomColumn {
  key: string;
  label: string;
}

interface AppData {
  id: string;
  name: string;
  name_en: string | null;
  brand_color: string;
  text_color: string;
  is_active: boolean;
  is_active_this_month?: boolean;
  employeeCount?: number;
  ordersCount?: number;
  custom_columns?: CustomColumn[];
}

interface EmployeeInApp {
  id: string;
  name: string;
  monthOrders: number;
  targetShare: number | null;
  projectedMonthEnd: number | null;
  onTrack: boolean | null;
}

type EmployeeAppRow = {
  employee_id: string;
  employees: {
    id: string;
    name: string;
    status: string;
    sponsorship_status: string | null;
  } | null;
};

// ─── App Modal ────────────────────────────────────────────────────────────────
interface AppModalProps {
  app?: AppData | null;
  onClose: () => void;
  onSaved: () => void;
}

const AppModal = ({ app, onClose, onSaved }: AppModalProps) => {
  const [saving, setSaving] = useState(false);
  const isEdit = !!app;

  const [form, setForm] = useState({
    name: app?.name || '',
    name_en: app?.name_en || '',
    brand_color: app?.brand_color || '#6366f1',
    text_color: app?.text_color || '#ffffff',
    is_active: app?.is_active ?? true,
  });

  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(
    app?.custom_columns || []
  );
  const [newColLabel, setNewColLabel] = useState('');

  const addColumn = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const key = `col_${Date.now()}`;
    setCustomColumns(prev => [...prev, { key, label }]);
    setNewColLabel('');
  };

  const removeColumn = (key: string) => {
    setCustomColumns(prev => prev.filter(c => c.key !== key));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'الاسم مطلوب' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      brand_color: form.brand_color,
      text_color: form.text_color,
      is_active: form.is_active,
      custom_columns: customColumns as unknown as Json,
    };

    try {
      if (isEdit && app) {
        await appService.update(app.id, payload);
      } else {
        await appService.create(payload);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : TOAST_ERROR_GENERIC;
      toast.error(TOAST_ERROR_GENERIC, { description: message });
      setSaving(false);
      return;
    }

    invalidateAppColorsCache();
    toast.success(isEdit ? TOAST_SUCCESS_EDIT : TOAST_SUCCESS_ADD);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border/50 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold text-foreground">
            {isEdit ? 'تعديل التطبيق' : 'إضافة تطبيق جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">اسم التطبيق (عربي) <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: هنقرستيشن" />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">اسم التطبيق (إنجليزي)</Label>
            <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. HungerStation" dir="ltr" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">لون التطبيق</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={e => setForm(p => ({ ...p, brand_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <Input value={form.brand_color} onChange={e => setForm(p => ({ ...p, brand_color: e.target.value }))} className="flex-1 font-mono text-sm" dir="ltr" maxLength={7} />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">لون النص</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <Input value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="flex-1 font-mono text-sm" dir="ltr" maxLength={7} />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">معاينة</Label>
            <div className="rounded-xl px-5 py-3 text-center font-bold text-base" style={{ backgroundColor: form.brand_color, color: form.text_color }}>
              {form.name || 'اسم التطبيق'}
            </div>
          </div>

          {/* Custom Columns Section */}
          <div className="border-t border-border pt-4 mt-2">
            <Label className="text-sm mb-2 block flex items-center gap-2">
              <Columns size={14} />
              أعمدة المستقطعات المخصصة
            </Label>
            <p className="text-[11px] text-muted-foreground mb-3">
              الأعمدة دى هتظهر فى جدول الرواتب تحت قسم المستقطعات (مثال: غرامات، تأمين، إلخ)
            </p>
            
            <div className="space-y-2 mb-3">
              {customColumns.map((col) => (
                <div key={col.key} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm">{col.label}</span>
                  <button
                    onClick={() => removeColumn(col.key)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {customColumns.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 italic">لا يوجد أعمدة مخصصة</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                placeholder="اسم العمود (مثال: تأمين، غرامات تأخير)"
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addColumn();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumn}
                disabled={!newColLabel.trim()}
                className="gap-1"
              >
                <PlusCircle size={14} />
                إضافة
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? 'جاري الحفظ...' : <><Check size={15} /> {isEdit ? 'حفظ التعديلات' : 'إضافة التطبيق'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Apps Page ───────────────────────────────────────────────────────────
const Apps = () => {
  const { permissions } = usePermissions('apps');
  const { selectedMonth: monthYear } = useTemporalContext();
  const [apps, setApps] = useState<AppData[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);
  const [appEmployees, setAppEmployees] = useState<EmployeeInApp[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  const [modalApp, setModalApp] = useState<AppData | null | undefined>(undefined);
  const [deleteApp, setDeleteApp] = useState<AppData | null>(null);
  const [deleting, setDeleting] = useState(false);

  type MonthlyApp = AppData & { is_active_this_month: boolean };

  type MonthOrderRow = {
    app_id: string | null;
    orders_count: number | null;
    employee_id: string | null;
  };

  const fetchMonthData = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = (await appService.getMonthlyApps(monthYear)) as MonthlyApp[];
      const ordersData = (await dashboardService.getMonthOrders(monthYear)) as (MonthOrderRow & {
        apps?: { id?: string; name?: string } | null;
      })[];
      
      const appsWithStats = await Promise.all(data.map(async (app: MonthlyApp) => {
        // Find employees who had orders for this app this month
        const appOrders = ordersData.filter((o) => o.app_id === app.id);
        const totalOrders = appOrders.reduce((sum: number, o) => sum + (o.orders_count ?? 0), 0);
        const activeRiders = new Set(appOrders.map((o) => o.employee_id)).size;

        return {
          ...app,
          employeeCount: activeRiders,
          ordersCount: totalOrders
        };
      }));

      setApps(appsWithStats);
    } catch (err) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'تعذر تحميل بيانات المنصات' });
    } finally {
      setLoadingApps(false);
    }
  }, [monthYear]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const handleSelectApp = async (app: AppData) => {
    if (selectedApp?.id === app.id) { setSelectedApp(null); setAppEmployees([]); return; }
    setSelectedApp(app);
    setLoadingEmployees(true);
    try {
      const startDate = `${monthYear}-01`;
      const endDate = `${monthYear}-${getDaysInMonth(new Date(`${monthYear}-01`))}`;

      const empApps = await appService.getActiveEmployeeAppsWithEmployees(app.id);
      
      // Filter employees who actually worked on this app this month OR are theoretically assigned
      const employees = (empApps as EmployeeAppRow[])
        .map(ea => ea.employees)
        .filter(Boolean)
        .filter((e) =>
          e.status === 'active' &&
          e.sponsorship_status !== 'absconded' &&
          e.sponsorship_status !== 'terminated'
        );

      const targetOrders = await appService.getAppTargetForMonth(app.id, monthYear);
      const riderCount = employees.length;
      const sharePerRider =
        targetOrders != null && riderCount > 0 ? targetOrders / riderCount : null;

      const now = new Date();
      const isCurrentMonth = monthYear === format(now, 'yyyy-MM');
      const daysInMonth = getDaysInMonth(new Date(`${monthYear}-01`));
      const daysPassed = isCurrentMonth ? Math.max(1, getDate(now)) : daysInMonth;

      const employeesWithOrders = await Promise.all(
        employees.map(async (emp) => {
          const orders = await appService.getEmployeeMonthlyOrders(emp.id, app.id, startDate, endDate);
          const total = orders.reduce((s: number, o) => s + o.orders_count, 0) || 0;
          const projectedMonthEnd = Math.round((total / daysPassed) * daysInMonth);
          return {
            id: emp.id,
            name: emp.name,
            monthOrders: total,
            targetShare: sharePerRider,
            projectedMonthEnd,
            onTrack: sharePerRider != null ? projectedMonthEnd >= sharePerRider * 0.95 : null,
          };
        })
      );
      setAppEmployees(employeesWithOrders);
    } catch (err: unknown) {
      toast.error(TOAST_ERROR_GENERIC, { description: 'تعذر تحميل مندوبي التطبيق' });
      setAppEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleToggleMonthlyActive = async (app: AppData, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !app.is_active_this_month;
    try {
      await appService.toggleMonthlyActive(app.id, monthYear, newStatus);
      toast.success(TOAST_SUCCESS_ACTION);
      fetchMonthData();
    } catch (err: unknown) {
      toast.error(TOAST_ERROR_GENERIC);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteApp) return;
    setDeleting(true);
    try {
      await appService.delete(deleteApp.id);
      toast.success(TOAST_SUCCESS_ACTION);
      if (selectedApp?.id === deleteApp.id) { setSelectedApp(null); setAppEmployees([]); }
      setDeleteApp(null);
      fetchMonthData();
    } catch (err: unknown) {
      toast.error(TOAST_ERROR_GENERIC);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-1">
            <span>الرئيسية</span><span className="opacity-50">/</span>
            <span className="text-muted-foreground font-medium">التطبيقات</span>
          </nav>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <Smartphone size={22} className="text-primary" />
            أرشيف المنصات والتطبيقات
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">إدارة تفعيل المنصات ومتابعة أدائها التاريخي</p>
        </div>
        
        <div className="flex items-center gap-3">
          {permissions.can_edit && (
            <Button onClick={() => setModalApp(null)} className="gap-2 shadow-sm">
              <Plus size={16} /> إضافة منصة
            </Button>
          )}
        </div>
      </div>

      <PageSection title={`منصات شهر ${format(new Date(`${monthYear}-01`), 'MMMM yyyy', { locale: ar })}`}>
        {loadingApps ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-40 bg-muted/40 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {apps.map(app => {
              const isSelected = selectedApp?.id === app.id;
              const isActiveInMonth = app.is_active_this_month;
              
              return (
                <div
                  key={app.id}
                  onClick={() => isActiveInMonth && handleSelectApp(app)}
                  className={`relative rounded-2xl text-center transition-all cursor-pointer group overflow-hidden border
                    ${!isActiveInMonth ? 'opacity-50 grayscale hover:grayscale-0' : 'shadow-sm hover:shadow-md hover:scale-[1.01]'}
                    ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
                >
                  <div className="p-5 h-full bg-card">
                    {/* Action buttons */}
                    {permissions.can_edit && (
                      <div
                        className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={e => { e.stopPropagation(); setModalApp(app); }}
                          className="w-7 h-7 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={e => handleToggleMonthlyActive(app, e)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isActiveInMonth ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                          title={isActiveInMonth ? 'تعطيل لهذا الشهر' : 'تفعيل لهذا الشهر'}
                        >
                          {isActiveInMonth ? <PowerOff size={12} /> : <Power size={12} />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteApp(app); }}
                          className="w-7 h-7 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
                          title="أرشفة نهائية"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl font-bold shadow-sm"
                      style={{ backgroundColor: `${app.brand_color}15`, color: app.brand_color }}
                    >
                      {app.name.charAt(0)}
                    </div>

                    <h3 className="font-bold text-sm text-foreground truncate">{app.name}</h3>
                    
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">المناديب العمليين</span>
                        <span className="font-bold text-foreground">{app.employeeCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">إجمالي الطلبات</span>
                        <span className="font-bold text-primary">{app.ordersCount?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    {!isActiveInMonth && (
                      <div className="absolute inset-0 bg-background/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded-lg text-[10px] font-bold border border-border">غير مفعلة للشهر</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new card */}
            {permissions.can_edit && (
              <button
                onClick={() => setModalApp(null)}
                className="p-5 rounded-2xl border-2 border-dashed border-border text-center transition-all hover:border-primary/50 hover:bg-primary/5 group min-h-[160px] flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus size={20} className="text-muted-foreground group-hover:text-primary" />
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-primary font-medium">إضافة منصة جديدة</p>
              </button>
            )}
          </div>
        )}

        {selectedApp && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: selectedApp.brand_color }}>
                  {selectedApp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">تفاصيل أداء {selectedApp.name}</h3>
                  <p className="text-[10px] text-muted-foreground">لشهر {format(new Date(`${monthYear}-01`), 'MMMM yyyy', { locale: ar })}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="ta-table-wrap">
              {loadingEmployees ? (
                <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  جارٍ تحميل أرقام المناديب...
                </div>
              ) : appEmployees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                   لم يتم تسجيل أي طلبات لهذه المنصة بواسطة المناديب في هذا الشهر.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="ta-thead">
                    <tr>
                      <th className="ta-th text-right">المندوب</th>
                      <th className="ta-th text-center">حالة العمل</th>
                      <th className="ta-th text-center">الطلبات المنفذة</th>
                      <th className="ta-th text-center">حصة الهدف</th>
                      <th className="ta-th text-center">التوقع</th>
                      <th className="ta-th text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appEmployees.map(emp => (
                      <tr key={emp.id} className="ta-tr group">
                        <td className="ta-td font-bold text-foreground text-right">{emp.name}</td>
                        <td className="ta-td text-center"><span className="badge-success text-[10px]">نشط</span></td>
                        <td className="ta-td text-center font-black text-sm" style={{ color: selectedApp.brand_color }}>
                          {emp.monthOrders.toLocaleString()}
                        </td>
                        <td className="ta-td text-center text-xs tabular-nums text-muted-foreground">
                          {emp.targetShare != null ? Math.round(emp.targetShare).toLocaleString() : '—'}
                        </td>
                        <td className="ta-td text-center text-xs tabular-nums font-semibold">
                          {emp.projectedMonthEnd != null ? emp.projectedMonthEnd.toLocaleString() : '—'}
                        </td>
                        <td className="ta-td text-center">
                          {emp.onTrack === null ? (
                            <span className="text-[10px] text-muted-foreground">بدون هدف</span>
                          ) : emp.onTrack ? (
                            <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Check size={10} /> يحقق التارجت
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <X size={10} /> تحت التارجت
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </PageSection>

      {/* Edit/Add Modal */}
      {modalApp !== undefined && (
        <AppModal
          app={modalApp}
          onClose={() => setModalApp(undefined)}
          onSaved={() => fetchMonthData()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteApp} onOpenChange={open => { if (!open) setDeleteApp(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة المنصة (Soft Delete)</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أرشفة <strong>"{deleteApp?.name}"</strong>؟ 
              لن تظهر المنصة في الأشهر القادمة، ولكنها **ستبقى محفوظة** في أرشيف الأشهر الماضية للحفاظ على دقة الرواتب والتقارير.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'جاري الأرشفة...' : 'تأكيد الأرشفة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Apps;
