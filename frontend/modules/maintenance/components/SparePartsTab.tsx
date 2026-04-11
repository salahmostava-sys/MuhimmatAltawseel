import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
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
import { useToast } from '@shared/hooks/use-toast';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useSpareParts, useInvalidateMaintenanceQueries } from '@modules/maintenance/hooks/useMaintenanceData';
import * as maintenanceService from '@services/maintenanceService';
import type { SparePart } from '@services/maintenanceService';
import { cn } from '@shared/lib/utils';

const emptyForm: maintenanceService.CreateSparePartInput = {
  name_ar: '',
  part_number: '',
  stock_quantity: 0,
  min_stock_alert: 5,
  unit: '�‚طعة',
  unit_cost: 0,
  supplier: '',
  notes: '',
};

export function SparePartsTab() {
  const { permissions } = usePermissions('maintenance');
  const { toast } = useToast();
  const invalidate = useInvalidateMaintenanceQueries();
  const q = useSpareParts();
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((p) => {
      const blob = [
        p.name_ar,
        p.part_number ?? '',
        p.supplier ?? '',
        p.notes ?? '',
        p.unit,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(t);
    });
  }, [rows, search]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState<maintenanceService.CreateSparePartInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);

  const summary = useMemo(() => {
    let low = 0;
    let stockValue = 0;
    for (const p of rows) {
      if (Number(p.stock_quantity) < Number(p.min_stock_alert ?? 0)) low += 1;
      stockValue += Number(p.stock_quantity) * Number(p.unit_cost);
    }
    return { count: rows.length, low, stockValue };
  }, [rows]);

  const filteredSummary = useMemo(() => {
    let low = 0;
    for (const p of filteredRows) {
      if (Number(p.stock_quantity) < Number(p.min_stock_alert ?? 0)) low += 1;
    }
    return { count: filteredRows.length, low };
  }, [filteredRows]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: SparePart) => {
    setEditing(p);
    setForm({
      name_ar: p.name_ar,
      part_number: p.part_number ?? '',
      stock_quantity: p.stock_quantity,
      min_stock_alert: p.min_stock_alert,
      unit: p.unit,
      unit_cost: p.unit_cost,
      supplier: p.supplier ?? '',
      notes: p.notes ?? '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name_ar.trim()) {
      toast({ title: 'أدخ�„ اس�… ا�„�‚طعة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await maintenanceService.updateSparePart(editing.id, {
          name_ar: form.name_ar,
          part_number: form.part_number || null,
          stock_quantity: Number(form.stock_quantity),
          min_stock_alert: Number(form.min_stock_alert),
          unit: form.unit ?? '�‚طعة',
          unit_cost: Number(form.unit_cost),
          supplier: form.supplier || null,
          notes: form.notes || null,
        });
        toast({ title: 'ت�… ا�„تحد�Šث' });
      } else {
        await maintenanceService.createSparePart({
          ...form,
          stock_quantity: Number(form.stock_quantity),
          min_stock_alert: Number(form.min_stock_alert),
          unit_cost: Number(form.unit_cost),
        });
        toast({ title: 'ت�…ت ا�„إضافة' });
      }
      invalidate();
      setDialogOpen(false);
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await maintenanceService.deleteSparePart(deleteTarget.id);
      toast({ title: 'ت�… ا�„حذف' });
      invalidate();
      setDeleteTarget(null);
    } catch (e) {
      toast({
        title: 'تعذر ا�„حذف',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">إج�…ا�„�Š ا�„�‚طع</div>
          <div className="text-2xl font-bold">{summary.count}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">�‚طع تحت ا�„حد</div>
          <div className="text-2xl font-bold text-destructive">{summary.low}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">�‚�Š�…ة ا�„�…خز�ˆ�† (ت�‚د�Šر�Šة)</div>
          <div className="text-2xl font-bold">
            {summary.stockValue.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            className="pr-9"
            placeholder="بحث با�„اس�…�Œ ا�„ر�‚�…�Œ ا�„�…�ˆرد�Œ ا�„�…�„احظات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {permissions.can_edit && (
          <Button className="gap-1 w-full sm:w-auto shrink-0" onClick={openCreate}>
            <Plus size={16} /> إضافة �‚طعة
          </Button>
        )}
      </div>

      {search.trim() && (
        <p className="text-xs text-muted-foreground">
          عرض {filteredSummary.count} �…�† أص�„ {summary.count} �‚طعة
          {filteredSummary.low > 0 ? ` �€” ${filteredSummary.low} تحت ا�„حد ف�Š ا�„�†تائج` : ''}
        </p>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-right">ا�„اس�…</th>
                <th className="px-3 py-2 text-right">ر�‚�… ا�„�‚طعة</th>
                <th className="px-3 py-2 text-right">ا�„�…خز�ˆ�†</th>
                <th className="px-3 py-2 text-right">ا�„حد ا�„أد�†�‰</th>
                <th className="px-3 py-2 text-right">ا�„�ˆحدة</th>
                <th className="px-3 py-2 text-right">سعر ا�„�ˆحدة</th>
                <th className="px-3 py-2 text-right">ا�„�…�ˆرد</th>
                <th className="px-3 py-2 text-right max-w-[200px]">�…�„احظات</th>
                <th className="px-3 py-2 text-right w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 className="inline animate-spin" />
                  </td>
                </tr>
              )}
              {!q.isLoading &&
                filteredRows.map((p) => {
                  const low = Number(p.stock_quantity) < Number(p.min_stock_alert ?? 0);
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'border-b border-border/30',
                        low && 'bg-destructive/5 text-destructive'
                      )}
                    >
                      <td className="px-3 py-2 font-medium">{p.name_ar}</td>
                      <td className="px-3 py-2">{p.part_number ?? '�€”'}</td>
                      <td className="px-3 py-2">{p.stock_quantity}</td>
                      <td className="px-3 py-2">{p.min_stock_alert}</td>
                      <td className="px-3 py-2">{p.unit}</td>
                      <td className="px-3 py-2">{p.unit_cost}</td>
                      <td className="px-3 py-2">{p.supplier ?? '�€”'}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground text-xs" title={p.notes ?? undefined}>
                        {p.notes?.trim() ? p.notes : '�€”'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {permissions.can_edit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil size={16} />
                            </Button>
                          )}
                          {permissions.can_delete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!q.isLoading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    {rows.length === 0 ? '�„ا ت�ˆجد �‚طع ف�Š ا�„�…خز�ˆ�†. أضف �‚طعة أ�ˆ طب�‘�‚ ترح�Š�„ات �‚اعدة ا�„ب�Šا�†ات.' : '�„ا ت�ˆجد �†تائج �…طاب�‚ة �„�„بحث.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعد�Š�„ �‚طعة' : 'إضافة �‚طعة'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>ا�„اس�…</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>ر�‚�… ا�„�‚طعة</Label>
              <Input
                value={form.part_number ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, part_number: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>ا�„�…خز�ˆ�†</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>ا�„حد ا�„أد�†�‰</Label>
                <Input
                  type="number"
                  value={form.min_stock_alert}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, min_stock_alert: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>ا�„�ˆحدة</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>سعر ا�„�ˆحدة</Label>
                <Input
                  type="number"
                  value={form.unit_cost}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unit_cost: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>ا�„�…�ˆرد</Label>
              <Input
                value={form.supplier ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>�…�„احظات</Label>
              <Input
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="اخت�Šار�Š"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إ�„غاء
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ا�„�‚طعة�Ÿ</AlertDialogTitle>
            <AlertDialogDescription>
              �„ا �Š�…�ƒ�† ا�„حذف إذا �ƒا�†ت �…ستخد�…ة ف�Š سج�„ات ص�Šا�†ة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إ�„غاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doDelete()}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
