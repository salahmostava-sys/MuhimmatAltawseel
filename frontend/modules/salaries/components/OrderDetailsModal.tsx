import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Package, Calculator, TrendingUp } from 'lucide-react';
import {
  getPlatformActivitySummary,
  getSalaryRowActivitySummary,
  getSalaryRowActivityTotals,
  hasPlatformActivity,
} from '@modules/salaries/model/salaryUtils';
import type { SalaryRow, SchemeData } from '@modules/salaries/types/salary.types';

interface OrderDetailsModalProps {
  row: SalaryRow;
  empPlatformScheme: Record<string, Record<string, SchemeData | null>>;
}

function getWorkTypeBadge(workType?: string | null) {
  if (workType === 'shift') return { label: 'دوام', className: 'bg-info/10 text-info border-info/20' };
  if (workType === 'hybrid') return { label: 'مختلط', className: 'bg-warning/10 text-warning border-warning/20' };
  return { label: 'طلبات', className: 'bg-primary/10 text-primary border-primary/20' };
}

export function OrderDetailsModal({ row, empPlatformScheme }: OrderDetailsModalProps) {
  const [open, setOpen] = useState(false);
  
  const totalActivity = Object.values(row.platformOrders).reduce((sum, count) => sum + count, 0);
  const totalSalary = Object.values(row.platformSalaries).reduce((sum, sal) => sum + sal, 0);
  const activitySummary = getSalaryRowActivitySummary(row);
  const activityTotals = getSalaryRowActivityTotals(row);
  const platforms = row.registeredApps.filter((platform) => hasPlatformActivity(row.platformMetrics[platform]));
  
  const formatCurrency = (val: number) => `${Math.round(val).toLocaleString('ar-SA')} ر.س`;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 gap-1 text-xs font-semibold hover:bg-primary/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="h-3.5 w-3.5" />
          <span>{totalActivity.toLocaleString('ar-SA')}</span>
          <span className="text-muted-foreground">نشاط</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            تفاصيل النشاط والراتب
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Employee Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="font-semibold text-foreground">{row.employeeName}</div>
            <div className="text-xs text-muted-foreground">{row.jobTitle} • {row.nationalId}</div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold leading-tight text-primary">{activitySummary}</div>
              <div className="mt-1 text-xs text-muted-foreground">إجمالي النشاط</div>
            </div>
            <div className="bg-success/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(totalSalary)}</div>
              <div className="text-xs text-muted-foreground">إجمالي الراتب</div>
            </div>
          </div>
          
          {/* Platform Breakdown */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b">
              تفصيل النشاط حسب المنصة
            </div>
            <div className="divide-y">
              {platforms.map(platform => {
                const metric = row.platformMetrics[platform];
                const activityLabel = getPlatformActivitySummary(metric);
                const orders = metric?.ordersCount || 0;
                const shiftDays = metric?.shiftDays || 0;
                const salary = row.platformSalaries[platform] || 0;
                const scheme = empPlatformScheme?.[row.employeeId]?.[platform];
                const avgPerOrder = orders > 0 ? salary / orders : 0;
                const avgPerShift = shiftDays > 0 ? salary / shiftDays : 0;
                const workTypeBadge = getWorkTypeBadge(metric?.workType);
                
                return (
                  <div key={platform} className="px-3 py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{platform}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${workTypeBadge.className}`}>
                          {workTypeBadge.label}
                        </Badge>
                        {scheme?.scheme_type === 'fixed_monthly' && (
                          <span className="text-[10px] text-muted-foreground">(راتب ثابت)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>{activityLabel}</span>
                        {metric?.workType === 'orders' && orders > 0 && (
                          <span> • متوسط: {avgPerOrder.toFixed(2)} ر.س / طلب</span>
                        )}
                        {metric?.workType === 'shift' && shiftDays > 0 && (
                          <span> • متوسط: {avgPerShift.toFixed(2)} ر.س / دوام</span>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{activityLabel}</div>
                      <div className="text-xs text-success font-medium">
                        {formatCurrency(salary)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {platforms.length === 0 && (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  لا يوجد نشاط مسجل لهذا الشهر
                </div>
              )}
            </div>
          </div>
          
          {/* Calculation Formula */}
          <div className="bg-info/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-info mb-2">
              <Calculator className="h-4 w-4" />
              طريقة حساب الراتب
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>• المنصات حسب الطلب تُحسب بالطلبات × الشريحة أو قاعدة التسعير.</p>
              <p>• منصات الدوام لا تدخل ضمن الطلبات اليومية، وتُحسب بعدد أيام الدوام المؤهلة.</p>
              <p>• المنصات المختلطة قد تجمع بين الدوام والطلبات حسب إعداد المنصة.</p>
            </div>
          </div>
          
          {/* Target Bonus Info */}
          {platforms.some(p => {
            const scheme = empPlatformScheme?.[row.employeeId]?.[p];
            return scheme?.target_orders && (row.platformMetrics[p]?.ordersCount || 0) >= scheme.target_orders;
          }) && (
            <div className="bg-success/10 rounded-lg p-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-success">
                تم تحقيق هدف الطلبات في إحدى المنصات - مكافأة إضافية مضافة!
              </span>
            </div>
          )}
        </div>

        {(activityTotals.orders > 0 || activityTotals.shiftDays > 0) && (
          <div className="px-1 pb-2 text-[11px] text-muted-foreground">
            {activityTotals.orders > 0 && <span>{activityTotals.orders.toLocaleString('ar-SA')} طلب</span>}
            {activityTotals.orders > 0 && activityTotals.shiftDays > 0 && <span> • </span>}
            {activityTotals.shiftDays > 0 && <span>{activityTotals.shiftDays.toLocaleString('ar-SA')} دوام</span>}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
