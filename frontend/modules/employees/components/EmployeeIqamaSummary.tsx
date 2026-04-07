import { differenceInDays, format, parseISO } from 'date-fns';
import type { Employee } from '@modules/employees/model/employeeUtils';

type EmployeeIqamaSummaryProps = {
  employees: Employee[];
  alertDays: number;
};

type GroupedIqama = {
  commercialRecord: string;
  count: number;
  expiredCount: number;
  nearestDaysLeft: number;
  nearestDate: string;
  employeeNames: string[];
};

function normalizeCommercialRecordLabel(value: string | null | undefined) {
  return value?.trim() || 'بدون سجل تجاري';
}

export function EmployeeIqamaSummary({
  employees,
  alertDays,
}: EmployeeIqamaSummaryProps) {
  const today = new Date();

  const expiringEmployees = employees
    .filter((employee) => employee.status === 'active' && employee.residency_expiry)
    .map((employee) => {
      const expiry = String(employee.residency_expiry).slice(0, 10);
      const daysLeft = differenceInDays(parseISO(expiry), today);
      return {
        employee,
        expiry,
        daysLeft,
      };
    })
    .filter((row) => row.daysLeft <= alertDays);

  const groupedMap = new Map<string, GroupedIqama>();

  for (const row of expiringEmployees) {
    const commercialRecord = normalizeCommercialRecordLabel(row.employee.commercial_record);
    const current = groupedMap.get(commercialRecord);
    if (!current) {
      groupedMap.set(commercialRecord, {
        commercialRecord,
        count: 1,
        expiredCount: row.daysLeft < 0 ? 1 : 0,
        nearestDaysLeft: row.daysLeft,
        nearestDate: row.expiry,
        employeeNames: [row.employee.name],
      });
      continue;
    }

    current.count += 1;
    current.expiredCount += row.daysLeft < 0 ? 1 : 0;
    if (row.daysLeft < current.nearestDaysLeft) {
      current.nearestDaysLeft = row.daysLeft;
      current.nearestDate = row.expiry;
    }
    if (!current.employeeNames.includes(row.employee.name) && current.employeeNames.length < 4) {
      current.employeeNames.push(row.employee.name);
    }
  }

  const groups = [...groupedMap.values()].sort((a, b) => {
    if (a.nearestDaysLeft !== b.nearestDaysLeft) return a.nearestDaysLeft - b.nearestDaysLeft;
    if (a.count !== b.count) return b.count - a.count;
    return a.commercialRecord.localeCompare(b.commercialRecord, 'ar');
  });

  const expiredEmployeesCount = expiringEmployees.filter((row) => row.daysLeft < 0).length;

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">ملخص الإقامات حسب السجل التجاري</h2>
            <p className="text-xs text-muted-foreground">لا توجد إقامات قريبة الانتهاء ضمن نافذة التنبيه الحالية.</p>
          </div>
          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            سليم
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">ملخص الإقامات حسب السجل التجاري</h2>
          <p className="text-xs text-muted-foreground">
            حصر للموظفين الذين تنتهي إقاماتهم خلال {alertDays} يومًا أو أقل.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">الإقامات القريبة</p>
            <p className="text-lg font-bold text-foreground">{expiringEmployees.length}</p>
          </div>
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">المنتهية</p>
            <p className="text-lg font-bold text-destructive">{expiredEmployeesCount}</p>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">السجلات المتأثرة</p>
            <p className="text-lg font-bold text-primary">{groups.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {groups.map((group) => {
          const urgencyClass =
            group.nearestDaysLeft < 0
              ? 'bg-destructive/10 text-destructive'
              : group.nearestDaysLeft <= 14
                ? 'bg-warning/10 text-warning'
                : 'bg-primary/10 text-primary';

          const nearestLabel =
            group.nearestDaysLeft < 0
              ? `منتهية منذ ${Math.abs(group.nearestDaysLeft)} يوم`
              : `الأقرب بعد ${group.nearestDaysLeft} يوم`;

          return (
            <div
              key={group.commercialRecord}
              className="rounded-2xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{group.commercialRecord}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.employeeNames.join('، ')}
                    {group.count > group.employeeNames.length ? ` +${group.count - group.employeeNames.length}` : ''}
                  </p>
                </div>
                <div className="text-end">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${urgencyClass}`}>
                    {group.count} إقامة
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">{nearestLabel}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>أقرب انتهاء: {format(parseISO(group.nearestDate), 'yyyy/MM/dd')}</span>
                <span>منتهية: {group.expiredCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EmployeeIqamaSummary;

