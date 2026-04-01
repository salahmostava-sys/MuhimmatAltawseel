import { Map, Clock, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';

export const HeatmapTab = () => {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);

  // Placeholder query
  const { data, isLoading } = useQuery({
    queryKey: ['heatmap-summary', uid],
    enabled,
    queryFn: async () => {
      return {
        peakHoursText: '10:00 م - 1:00 ص',
        targetCompany: 45000,
        currentCompanyOrders: 32000,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted/40 rounded-2xl" />)}
      </div>
    );
  }

  const completionPct = Math.round((data.currentCompanyOrders / data.targetCompany) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Peak Hours */}
        <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Clock size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">ساعات الذروة والمتوسط</h3>
              <p className="text-[10px] text-muted-foreground">أكثر وقت لتسجيل الطلبات</p>
            </div>
          </div>
          <p className="text-2xl font-black text-foreground relative z-10">{data.peakHoursText}</p>
          <div className="mt-2 text-xs font-semibold text-purple-600">ينصح بتكثيف الحضور</div>
        </div>

        {/* Company Target vs Providers */}
        <div className="col-span-1 lg:col-span-2 bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Target size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">الهدف الشهري للشركة</h3>
              <p className="text-[10px] text-muted-foreground">التارجت المشترك مع المنصات للتأهل للبونص</p>
            </div>
          </div>
          
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">{data.currentCompanyOrders.toLocaleString()} طلب</span>
              <span className="text-xs text-muted-foreground font-semibold">تارجت: {data.targetCompany.toLocaleString()}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-700" 
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              نسبة التحقيق حتى الآن: <strong>{completionPct}%</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
