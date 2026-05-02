import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, User, Phone, MapPin, Briefcase, Calendar, Bike, ExternalLink, Hash } from 'lucide-react';
import { employeeService } from '@services/employeeService';
import { cn } from '@shared/lib/utils';
import { Skeleton } from '@shared/components/ui/skeleton';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';

type EmployeeInfo = {
  id: string;
  name: string;
  phone: string;
  city: string;
  tier: string;
  work_type: string;
  join_date: string;
  vehicle_name: string;
  status: string;
  employee_id: string;
};

type Props = {
  employeeId: string | null;
  open: boolean;
  onClose: () => void;
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  inactive: { label: 'غير نشط', className: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30' },
  suspended: { label: 'موقوف', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  on_leave: { label: 'إجازة', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
};

/**
 * EmployeeQuickView — لوحة جانبية تنزلق من اليمين لعرض بيانات الموظف بسرعة.
 * تتضمن رابط للملف الكامل وبادج الحالة.
 */
export function EmployeeQuickView({ employeeId, open, onClose }: Props) {
  const [data, setData] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployee = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const result = await employeeService.getById(employeeId);
      // TypeScript: extract needed fields with proper typing
      const employee = result as Record<string, unknown>;
      setData({
        id: (employee.id as string) ?? employeeId,
        name: (employee.name as string) ?? (employee.full_name as string) ?? '',
        phone: (employee.phone as string) ?? '',
        city: (employee.city as string) ?? '',
        tier: (employee.tier as string) ?? '',
        work_type: (employee.work_type as string) ?? '',
        join_date: (employee.join_date as string) ?? (employee.created_at as string) ?? '',
        vehicle_name: (employee.vehicle_name as string) ?? (employee.plate_number as string) ?? '',
        status: (employee.status as string) ?? 'active',
        employee_id: (employee.employee_id as string) ?? '',
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (open && employeeId) {
      void fetchEmployee();
    } else {
      setData(null);
    }
  }, [open, employeeId, fetchEmployee]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const statusInfo = STATUS_MAP[data?.status ?? ''] ?? STATUS_MAP.active;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card shadow-2xl transition-transform duration-300',
          'flex flex-col border-l border-border',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">
              {loading ? 'تحميل...' : data?.name ?? 'بيانات الموظف'}
            </h3>
            {!loading && data ? (
              <Badge variant="outline" className={cn('text-[10px] shrink-0', statusInfo.className)}>
                {statusInfo.label}
              </Badge>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-4">
              {['s1','s2','s3','s4','s5','s6','s7'].map((key) => (
                <Skeleton key={key} className="h-6 w-full rounded-lg" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-4">
              {data.employee_id ? (
                <InfoRow icon={<Hash size={15} />} label="رقم الموظف" value={data.employee_id} />
              ) : null}
              <InfoRow icon={<User size={15} />} label="الاسم" value={data.name} />
              <InfoRow icon={<Phone size={15} />} label="الهاتف" value={data.phone || '—'} />
              <InfoRow icon={<MapPin size={15} />} label="المدينة" value={data.city || '—'} />
              <InfoRow icon={<Briefcase size={15} />} label="الدرجة" value={data.tier || '—'} />
              <InfoRow icon={<Calendar size={15} />} label="نوع العمل" value={data.work_type || '—'} />
              <InfoRow icon={<Bike size={15} />} label="المركبة" value={data.vehicle_name || '—'} />
              <InfoRow
                icon={<Calendar size={15} />}
                label="تاريخ الانضمام"
                value={
                  data.join_date
                    ? new Date(data.join_date).toLocaleDateString('ar-SA')
                    : '—'
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              تعذر تحميل بيانات الموظف
            </p>
          )}
        </div>

        {/* Footer — link to full profile */}
        {!loading && data ? (
          <div className="px-5 py-3 border-t border-border">
            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <Link to={`/employees?profile=${data.id}`} onClick={onClose}>
                <ExternalLink size={14} />
                فتح الملف الكامل
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** A single info row inside the drawer */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
