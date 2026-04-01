import * as XLSX from '@e965/xlsx';
import { Download } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';
import type { DashboardExportKpis } from '@modules/dashboard/types/dashboardExportKpis';

export type { DashboardExportKpis };

type DashboardExportCardProps = Readonly<{
  monthYear: string;
  loading: boolean;
  kpis: DashboardExportKpis;
  orderGrowth: number;
  className?: string;
}>;

function buildSheetRows(monthYear: string, kpis: DashboardExportKpis, orderGrowth: number): (string | number)[][] {
  const avgPerRider = kpis.activeRiders > 0 ? Math.round(kpis.totalOrders / kpis.activeRiders) : 0;
  return [
    ['المؤشر', 'القيمة'],
    ['الشهر (yyyy-MM)', monthYear],
    ['الموظفون النشطون (الشهر)', kpis.activeEmployees],
    ['المناديب المرتبطون بالمنصات', kpis.activeRiders],
    ['إجمالي طلبات الشهر', kpis.totalOrders],
    ['طلبات الشهر السابق', kpis.prevMonthOrders],
    ['نمو الطلبات %', Number(orderGrowth.toFixed(2))],
    ['هدف الشهر (إجمالي المنصات)', kpis.totalMonthTarget],
    ['نسبة الإنجاز من الهدف %', kpis.targetAchievementPct],
    ['متوسط طلبات/مندوب', avgPerRider],
    ['حاضرون اليوم', kpis.presentToday],
    ['غائبون اليوم', kpis.absentToday],
    ['متأخرون اليوم', kpis.lateToday],
    ['إجازة اليوم', kpis.leaveToday],
    ['مرضى اليوم', kpis.sickToday],
    ['المركبات النشطة', kpis.activeVehicles],
    ['التنبيهات غير المحلولة', kpis.activeAlerts],
    ['المنصات', kpis.activeApps],
    ['موظفون مكة', kpis.makkahCount],
    ['موظفون جدة', kpis.jeddahCount],
    ['الإيراد التقديري (الشهر)', kpis.estRevenueTotal],
  ];
}

export function DashboardExportCard({ monthYear, loading, kpis, orderGrowth, className }: DashboardExportCardProps) {
  const handleExport = () => {
    const rows = buildSheetRows(monthYear, kpis, orderGrowth);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ملخص');
    XLSX.writeFile(wb, `لوحة_التحكم_${monthYear}.xlsx`);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 shadow-sm',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">تصدير ملخص المؤشرات</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">ملف Excel للشهر {monthYear}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 shrink-0"
        onClick={handleExport}
        disabled={loading}
      >
        <Download className="h-4 w-4" aria-hidden />
        تنزيل XLSX
      </Button>
    </div>
  );
}
