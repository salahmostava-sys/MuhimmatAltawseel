import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wrench, Loader2, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent } from '@shared/components/ui/tabs';
import { Card, CardContent } from '@shared/components/ui/card';
import { ResponsiveTabBar } from '@shared/components/ResponsiveTabBar';
import { MaintenanceLogsTab } from '@modules/maintenance/components/MaintenanceLogsTab';
import { SparePartsTab } from '@modules/maintenance/components/SparePartsTab';
import { useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';

const MAINT_TABS = ['logs', 'inventory'] as const;
type MaintTab = (typeof MAINT_TABS)[number];

const isMaintTab = (v: string | null): v is MaintTab =>
  v !== null && MAINT_TABS.includes(v as MaintTab);

const MaintenancePage = () => {
  const { authLoading } = useAuthQueryGate();
  const { permissions, loading: permsLoading } = usePermissions('maintenance');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => {
    const v = searchParams.get('tab');
    return isMaintTab(v) ? v : 'logs';
  }, [searchParams]);

  const onTabChange = useCallback(
    (v: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === 'logs') next.delete('tab');
          else next.set('tab', v);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (authLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.can_view) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <ShieldAlert size={40} className="text-destructive" />
        <p className="text-lg font-semibold">غير مصرح بالوصول</p>
        <p className="text-sm text-muted-foreground">ليس لديك صلاحية الوصول لصفحة الصيانة</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1600px]" dir="rtl">
      <div className="flex-shrink-0 space-y-2">
        <nav className="page-breadcrumb">
          <span>الرئيسية</span>
          <span className="page-breadcrumb-sep">/</span>
          <span>الصيانة والمخزون</span>
        </nav>
        <h1 className="page-title flex items-center gap-2">
          <Wrench size={18} /> الصيانة والمخزون
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          البيانات مُخزَّنة في قاعدة البيانات: جدول{' '}
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">
            maintenance_logs
          </span>{' '}
          للسجلات،{' '}
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">
            spare_parts
          </span>{' '}
          للمخزون، و
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mx-0.5" dir="ltr">
            maintenance_parts
          </span>
          لربط القطع بكل عملية صيانة. عند إضافة صيانة بكميات قطع، يُحدَّث رصيد المخزون تلقائياً حسب سياسات الخادم.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-3 sm:p-5 pt-4 sm:pt-5">
          <Tabs value={tab} onValueChange={onTabChange} dir="rtl" className="w-full">
            <ResponsiveTabBar
              value={tab}
              onValueChange={onTabChange}
              selectAriaLabel="قسم الصيانة والمخزون"
              options={[
                { value: 'logs', label: '🔧 سجل الصيانة', selectLabel: 'سجل الصيانة' },
                { value: 'inventory', label: '📦 المخزون وقطع الغيار', selectLabel: 'المخزون وقطع الغيار' },
              ]}
            />
            <TabsContent value="logs" className="mt-4 sm:mt-5 outline-none">
              <MaintenanceLogsTab />
            </TabsContent>
            <TabsContent value="inventory" className="mt-4 sm:mt-5 outline-none">
              <SparePartsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenancePage;
