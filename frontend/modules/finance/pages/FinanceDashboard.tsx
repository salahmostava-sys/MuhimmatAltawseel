import { useState, useMemo, useEffect } from 'react';
import {
  Wallet, TrendingDown, Receipt, Target,
  ArrowUpRight, ArrowDownRight, Clock, ShieldAlert,
  Settings, Save, Activity
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@shared/components/ui/button';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import { useTemporalContext } from '@app/providers/TemporalContext';

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3'] as const;

export default function FinanceDashboard() {
  const { enabled, userId } = useAuthQueryGate();
  const { selectedMonth: monthYear } = useTemporalContext();
  
  // Fetch previous month to calculate trends
  const prevMonthYear = useMemo(() => format(subMonths(new Date(`${monthYear}-01`), 1), 'yyyy-MM'), [monthYear]);

  const { data, isLoading } = useFinanceDashboard(monthYear, enabled);
  const { data: prevData, isLoading: prevLoading } = useFinanceDashboard(prevMonthYear, enabled);

  const [platformRates, setPlatformRates] = useState<Record<string, number>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load rates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('finance_platform_rates');
    if (saved) {
      try {
        setPlatformRates(JSON.parse(saved));
      } catch (e) {
        // Ignore malformed localStorage payload.
        void e;
      }
    }
  }, []);

  const saveRates = () => {
    localStorage.setItem('finance_platform_rates', JSON.stringify(platformRates));
    setIsSettingsOpen(false);
  };

  const handleRateChange = (appId: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setPlatformRates(prev => ({ ...prev, [appId]: num }));
    } else {
      setPlatformRates(prev => ({ ...prev, [appId]: 0 }));
    }
  };

  const { estimatedRevenue, profitMargin, revenueTrend } = useMemo(() => {
    if (!data) return { estimatedRevenue: 0, profitMargin: 0, revenueTrend: null };

    let currentRev = 0;
    Object.entries(data.ordersByApp).forEach(([appId, appStats]) => {
      const rate = platformRates[appId] || 15; // default 15
      currentRev += appStats.totalOrders * rate;
    });

    let prevRev = 0;
    if (prevData) {
      Object.entries(prevData.ordersByApp).forEach(([appId, appStats]) => {
        const rate = platformRates[appId] || 15;
        prevRev += appStats.totalOrders * rate;
      });
    }

    let revTrend = null;
    if (prevRev > 0) {
      const diff = currentRev - prevRev;
      const pct = (diff / prevRev) * 100;
      revTrend = { value: parseFloat(pct.toFixed(1)), positive: diff >= 0 };
    }

    return {
      estimatedRevenue: currentRev,
      profitMargin: currentRev - data.expectedPayroll,
      revenueTrend: revTrend,
    };
  }, [data, prevData, platformRates]);

  const payrollTrend = useMemo(() => {
    if (!data || !prevData || prevData.expectedPayroll === 0) return null;
    const diff = data.expectedPayroll - prevData.expectedPayroll;
    return {
      value: parseFloat(((diff / prevData.expectedPayroll) * 100).toFixed(1)),
      positive: diff > 0, // In payroll, positive implies an increase in expenses (might be visualized differently, let's keep it math based)
    };
  }, [data, prevData]);

  const deductionsTrend = useMemo(() => {
    if (!data || !prevData || prevData.totalDeductions === 0) return null;
    const diff = data.totalDeductions - prevData.totalDeductions;
    return {
      value: parseFloat(((diff / prevData.totalDeductions) * 100).toFixed(1)),
      positive: diff > 0,
    };
  }, [data, prevData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-1">
            <span>المالية</span><span className="opacity-50">/</span>
            <span className="text-muted-foreground font-medium">لوحة المراقبة</span>
          </nav>
          <h1 className="text-xl font-black text-foreground">لوحة المراقبة المالية</h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-2"
          >
            <Settings size={15} />
            إعدادات الإيراد
          </Button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">تسعيرة الإيرادات للمنصات (ر.س / طلب)</h3>
              <p className="text-xs text-muted-foreground mt-1">تؤثر هذه الأرقام فقط في حسابات الإيراد التقديري ضمن الداش بورد المالي.</p>
            </div>
            <Button size="sm" onClick={saveRates} className="flex items-center gap-1.5 h-8">
              <Save size={15} /> حفظ الإعدادات
            </Button>
          </div>
          
          {isLoading ? (
            <div className="h-20 animate-pulse bg-muted/40 rounded-lg"></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data?.apps.map(app => (
                <div key={app.id} className="bg-muted rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: app.brand_color }}></div>
                    <span className="text-xs font-bold text-foreground truncate">{app.name}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={platformRates[app.id] ?? 15}
                      onChange={(e) => handleRateChange(app.id, e.target.value)}
                      className="w-full bg-background rounded-md border border-border px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute left-2 text-[10px] text-muted-foreground top-2">ر.س</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SKELETON_KEYS.map((k) => (
            <div key={k} className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Live Payroll */}
            <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
                <Wallet size={120} />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Wallet size={20} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">إجمالي النفقات (الرواتب الصافية)</h3>
                  <p className="text-[10px] text-muted-foreground">بعد خصم المخالفات والسلف</p>
                </div>
              </div>
              <p className="text-3xl font-black text-foreground relative z-10">
                {data?.expectedPayroll?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span>
              </p>
              {payrollTrend && (
                <div className={`flex items-center gap-0.5 mt-2 text-[11px] font-semibold ${!payrollTrend.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {payrollTrend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(payrollTrend.value)}% عن الشهر السابق (النفقات)
                </div>
              )}
            </div>

            {/* Profit Margin / Estimated Revenue */}
            <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
                <Target size={120} />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Target size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">إجمالي الإيرادات التقريبي</h3>
                  <p className="text-[10px] text-muted-foreground">وفقاً لتسعيرة المنصات أعلاه</p>
                </div>
              </div>
              <p className="text-3xl font-black text-foreground relative z-10">
                {estimatedRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span>
              </p>
              {revenueTrend && (
                <div className={`flex items-center gap-0.5 mt-2 text-[11px] font-semibold ${revenueTrend.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {revenueTrend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(revenueTrend.value)}% عن الشهر السابق
                </div>
              )}
            </div>

            {/* WFR / Profit Margin  */}
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden group md:col-span-2 lg:col-span-1">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
                <Activity size={120} className="text-primary" />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Activity size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">الوفر / الهامش التقديري</h3>
                  <p className="text-[10px] text-primary/70">الإيرادات مطروحاً منها نفقات الرواتب</p>
                </div>
              </div>
              <p className="text-3xl font-black text-primary relative z-10">
                {profitMargin.toLocaleString()} <span className="text-sm font-normal text-primary/70">ر.س</span>
              </p>
            </div>
            
            {/* Total Deductions & Violations */}
            <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden group md:col-span-1 sm:col-span-2 lg:col-span-3">
              <div className="absolute -top-4 -left-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
                <Receipt size={120} />
              </div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <TrendingDown size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">المستردات (خصومات + مخالفات + سلف)</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">عاد إلى الشركة كمبالغ مستردة من المناديب</p>
                </div>
              </div>
              <p className="text-3xl font-black text-foreground relative z-10 mb-2">
                {data?.totalDeductions?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span>
              </p>
              {deductionsTrend && (
                <div className={`flex items-center gap-0.5 mt-2 text-[11px] font-semibold ${deductionsTrend.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {deductionsTrend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(deductionsTrend.value)}% عن الشهر السابق
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
