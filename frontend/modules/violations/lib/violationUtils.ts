import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import type {
  ViolationForm,
  ResultRow,
  ViolationRecord,
  ViolationSortFieldKey,
  VehicleAssignmentForViolation,
} from '@modules/violations/types/violation.types';

export function assignmentStartMs(a: VehicleAssignmentForViolation): number {
  return a.start_at ? new Date(a.start_at).getTime() : new Date(a.start_date).getTime();
}

export function assignmentEndMs(a: VehicleAssignmentForViolation): number {
  if (a.returned_at) return new Date(a.returned_at).getTime();
  if (a.end_date) return new Date(a.end_date + 'T23:59:59').getTime();
  return Date.now() + 1;
}

export function formatViolationFormDateDisplay(form: ViolationForm): string {
  if (form.use_time) {
    if (!form.violation_datetime) return '—';
    return format(new Date(form.violation_datetime), 'dd/MM/yyyy HH:mm', { locale: ar });
  }
  if (!form.violation_date_only) return '—';
  return format(parseISO(form.violation_date_only), 'dd/MM/yyyy', { locale: ar });
}

export function searchResultAssignButtonLabel(row: ResultRow, assigningEmployeeId: string | null): string {
  if (assigningEmployeeId === row.employee_id) return '...';
  if (row.status === 'recorded') return 'مسجّلة ✓';
  return 'تأكيد ✓';
}

export function violationApprovalStatusLabel(status: string): string {
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'approved') return 'موافَق';
  if (status === 'rejected') return 'مرفوض';
  return status;
}

export function convertToAdvanceTitle(convertedAdv: boolean): string {
  if (convertedAdv) return 'تم تحويل هذه المخالفة لسلفة';
  return 'تحويل لسلفة';
}

export function convertToAdvanceButtonLabel(convertingId: string | null, violationId: string, convertedAdv: boolean): string {
  if (convertingId === violationId) return '...';
  if (convertedAdv) return 'تم التحويل لسلفة ✓';
  return 'تحويل لسلفة';
}

export function deleteViolationButtonLabel(deletingId: string | null, violationId: string): string {
  return deletingId === violationId ? '...' : 'حذف';
}

export function savedViolationsCountLabel(loading: boolean, count: number): string {
  if (loading) return 'جارٍ التحميل...';
  return `${count} سجل`;
}

export function violationApprovalBadgeClasses(status: string): string {
  if (status === 'approved') return 'bg-success/10 text-success border-success/20';
  if (status === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/20';
  return 'bg-muted text-muted-foreground border-border/50';
}

export function getViolationSortValue(
  row: ViolationRecord,
  field: ViolationSortFieldKey,
  isConverted: (v: ViolationRecord) => boolean
): string | number {
  switch (field) {
    case 'amount':
      return row.amount || 0;
    case 'incident_date':
      return row.incident_date || '';
    case 'status':
      return row.status || '';
    case 'violation_details':
      return row.violation_details || '';
    case 'advance_status':
      return isConverted(row) ? 1 : 0;
    default:
      return row.employee_name || '';
  }
}
