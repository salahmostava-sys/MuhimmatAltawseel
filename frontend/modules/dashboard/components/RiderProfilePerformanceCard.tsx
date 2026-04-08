import { type ComponentType } from 'react';
import { Calendar, Clock3, Package, Target, TrendingUp, Wallet } from 'lucide-react';

import type { EmployeePerformanceProfileResponse } from '@services/performanceService';
import {
  getEmployeeWorkTypeLabel,
  isAttendanceCapableEmployeeWorkType,
  isOrdersCapableEmployeeWorkType,
} from '@shared/lib/employeeWorkType';

function getSalarySourceLabel(source: EmployeePerformanceProfileResponse['summary']['salarySource']) {
  if (source === 'record') return 'من سجل راتب محفوظ';
  if (source === 'preview') return 'من معاينة الرواتب';
  return 'محسوب من الأداء الحالي';
}

function StatCard(props: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}>) {
  const { label, value, hint, icon: Icon } = props;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function ComparisonRow(props: Readonly<{
  label: string;
  current: number;
  previous: number;
  changePct: number;
  suffix?: string;
}>) {
  const { label, current, previous, changePct, suffix = '' } = props;
  const positive = changePct >= 0;

  return (
    <div className="flex items-center justify-between border-b border-border/30 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{previous.toLocaleString('ar-SA')}{suffix}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold text-foreground">{current.toLocaleString('ar-SA')}{suffix}</span>
        <span className={positive ? 'font-bold text-emerald-600' : 'font-bold text-rose-500'}>
          {positive ? '+' : ''}{changePct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function TimelineRow(props: Readonly<{
  monthYear: string;
  primary: string;
  secondary: string;
  score: number;
}>) {
  const { monthYear, primary, secondary, score } = props;

  return (
    <div className="flex items-center justify-between border-b border-border/30 py-2 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{monthYear}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{primary}</p>
      </div>
      <div className="text-end">
        <p className="text-sm font-semibold text-foreground">{secondary}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Score {score}/100</p>
      </div>
    </div>
  );
}

export function RiderProfilePerformanceCard(props: Readonly<{ data: EmployeePerformanceProfileResponse }>) {
  const { data } = props;
  const { employee, summary, comparisons, lastThreeMonths } = data;
  const canShowOrders = isOrdersCapableEmployeeWorkType(summary.workType);
  const canShowAttendance = isAttendanceCapableEmployeeWorkType(summary.workType);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-foreground">{employee.employeeName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{getEmployeeWorkTypeLabel(summary.workType)}</span>
              {employee.city ? <span>• {employee.city}</span> : null}
              {employee.joinDate ? <span>• انضم في {employee.joinDate}</span> : null}
            </div>
          </div>
          <div className="rounded-2xl bg-primary/10 px-3 py-2 text-center text-primary">
            <p className="text-[10px] font-semibold">Performance</p>
            <p className="text-lg font-black">{summary.performanceScore}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {canShowOrders ? (
          <StatCard
            label="إجمالي الطلبات"
            value={summary.totalOrders.toLocaleString('ar-SA')}
            hint={`${summary.activeOrderDays} يوم طلبات نشط`}
            icon={Package}
          />
        ) : null}
        {canShowOrders ? (
          <StatCard
            label="متوسط اليوم"
            value={summary.avgOrdersPerDay.toFixed(1)}
            hint={summary.monthlyTargetOrders > 0 ? `تحقيق الهدف ${summary.targetAchievementPct.toFixed(0)}%` : 'بدون هدف شهري'}
            icon={Target}
          />
        ) : null}
        {canShowAttendance ? (
          <StatCard
            label="أيام الحضور"
            value={summary.daysPresent.toLocaleString('ar-SA')}
            hint={`الغياب ${summary.daysAbsent} | التأخير ${summary.lateDays}`}
            icon={Clock3}
          />
        ) : null}
        {canShowAttendance ? (
          <StatCard
            label="معدل الالتزام"
            value={`${summary.attendanceRate.toFixed(1)}%`}
            hint={`إجازات ${summary.leaveDays} | مرضي ${summary.sickDays}`}
            icon={TrendingUp}
          />
        ) : null}
        <StatCard
          label="الراتب التقديري"
          value={`${summary.salary.toLocaleString('ar-SA')} ر.س`}
          hint={summary.salaryApproved ? 'من سجل راتب معتمد' : getSalarySourceLabel(summary.salarySource)}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">مقارنة مع الشهر السابق</h3>
          </div>
          {canShowOrders ? (
            <ComparisonRow
              label="الطلبات"
              current={comparisons.orders.current}
              previous={comparisons.orders.previous}
              changePct={comparisons.orders.changePct}
            />
          ) : null}
          {canShowAttendance ? (
            <ComparisonRow
              label="الحضور"
              current={comparisons.attendance.current}
              previous={comparisons.attendance.previous}
              changePct={comparisons.attendance.changePct}
            />
          ) : null}
          <ComparisonRow
            label="الراتب"
            current={comparisons.salary.current}
            previous={comparisons.salary.previous}
            changePct={comparisons.salary.changePct}
            suffix=" ر.س"
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">ملخص مالي</h3>
          </div>
          <div className="space-y-2 text-sm">
            {summary.workType !== 'orders' ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الراتب الأساسي</span>
                <span className="font-semibold text-foreground">{summary.baseSalary.toLocaleString('ar-SA')} ر.س</span>
              </div>
            ) : null}
            {canShowOrders ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مكون الطلبات</span>
                <span className="font-semibold text-foreground">{summary.orderSalaryComponent.toLocaleString('ar-SA')} ر.س</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الخصومات</span>
              <span className="font-semibold text-foreground">{summary.deductions.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الإضافات</span>
              <span className="font-semibold text-foreground">{summary.bonus.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-3">
              <span className="font-bold text-foreground">الصافي</span>
              <span className="text-lg font-black text-foreground">{summary.salary.toLocaleString('ar-SA')} ر.س</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <h3 className="text-sm font-bold text-foreground">ملاحظات ذكية</h3>
        <p className="mt-3 rounded-xl bg-muted/30 px-4 py-3 text-sm leading-7 text-foreground">{summary.aiPrompt}</p>
        <p className="mt-3 text-xs text-muted-foreground">{summary.message}</p>
      </div>

      {lastThreeMonths.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground">آخر 3 شهور</h3>
          <div className="mt-4 space-y-1">
            {lastThreeMonths.map((row) => (
              <TimelineRow
                key={row.monthYear}
                monthYear={row.monthYear}
                primary={
                  canShowOrders
                    ? `طلبات ${row.totalOrders.toLocaleString('ar-SA')}`
                    : `حضور ${row.daysPresent.toLocaleString('ar-SA')} | غياب ${row.daysAbsent}`
                }
                secondary={`${row.salary.toLocaleString('ar-SA')} ر.س`}
                score={row.performanceScore}
              />
            ))}
          </div>
        </div>
      ) : null}

      {summary.ordersByApp.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground">توزيع الطلبات حسب التطبيق</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.ordersByApp.map((app) => (
              <span
                key={app.appId}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={app.brandColor ? { backgroundColor: `${app.brandColor}20`, color: app.brandColor } : undefined}
              >
                {app.appName}: {app.ordersCount}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
