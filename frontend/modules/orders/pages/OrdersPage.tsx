import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Tabs, TabsContent } from '@shared/components/ui/tabs';
import { ResponsiveTabBar } from '@shared/components/ResponsiveTabBar';
import Loading from '@shared/components/Loading';

const SpreadsheetGridTab = lazy(() =>
  import('@modules/orders/components/SpreadsheetGridTab').then((module) => ({
    default: module.SpreadsheetGridTab,
  })),
);
const MonthSummaryTab = lazy(() =>
  import('@modules/orders/components/MonthSummaryTab').then((module) => ({
    default: module.MonthSummaryTab,
  })),
);
const ShiftsTabWrapper = lazy(() =>
  import('@modules/orders/components/ShiftsTabWrapper').then((module) => ({
    default: module.ShiftsTabWrapper,
  })),
);

const ORDER_TABS = ['grid', 'summary', 'shifts'] as const;
type OrderTab = (typeof ORDER_TABS)[number];

const isOrderTab = (v: string | null): v is OrderTab =>
  v !== null && ORDER_TABS.includes(v as OrderTab);

const TabLoader = () => <Loading minHeightClassName="min-h-[240px]" />;

const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => {
    const v = searchParams.get('tab');
    return isOrderTab(v) ? v : 'grid';
  }, [searchParams]);

  const onTabChange = useCallback(
    (v: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === 'grid') next.delete('tab');
          else next.set('tab', v);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div className="flex flex-col gap-3 w-full" dir="rtl">
      <div className="flex-shrink-0">
        <nav className="page-breadcrumb">
          <span>الرئيسية</span>
          <span className="page-breadcrumb-sep">/</span>
          <span>الطلبات اليومية</span>
        </nav>
        <h1 className="page-title flex items-center gap-2">
          <Package size={18} /> الطلبات اليومية
        </h1>
      </div>

      <Tabs value={tab} onValueChange={onTabChange} dir="rtl" className="w-full">
        <ResponsiveTabBar
          value={tab}
          onValueChange={onTabChange}
          selectAriaLabel="قسم الطلبات"
          tabsListClassName="bg-muted/50 p-0.5 h-9 items-stretch"
          options={[
            { value: 'grid', label: '📊 Grid الشهري', selectLabel: 'Grid الشهري' },
            { value: 'summary', label: 'ملخص الشهر', selectLabel: 'ملخص الشهر' },
            { value: 'shifts', label: '⏰ الدوام', selectLabel: 'الدوام' },
          ]}
        />
        <TabsContent value="grid" className="mt-2 outline-none">
          <Suspense fallback={<TabLoader />}>
            <SpreadsheetGridTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="summary" className="mt-2 overflow-x-auto outline-none">
          <Suspense fallback={<TabLoader />}>
            <MonthSummaryTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="shifts" className="mt-2 outline-none">
          <Suspense fallback={<TabLoader />}>
            <ShiftsTabWrapper />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersPage;
