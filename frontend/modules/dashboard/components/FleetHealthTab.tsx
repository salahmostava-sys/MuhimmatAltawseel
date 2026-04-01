import { Car, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';

export const FleetHealthTab = () => {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);

  // Placeholder static data representing fleet assets
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-health-summary', uid],
    enabled,
    queryFn: async () => {
      return {
        vehiclesTotal: 45,
        vehiclesActive: 38,
        vehiclesMaintenance: 5,
        vehiclesIdle: 2,
        iqamaAlerts: 12, // Expiring this month
        insuranceAlerts: 3,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted/40 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vehicles Status */}
        <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Car size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">حالة المركبات</h3>
              <p className="text-[10px] text-muted-foreground">التوزيع الحالي</p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">النشطة:</span>
              <span className="font-bold text-foreground">{data.vehiclesActive}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">صيانة:</span>
              <span className="font-bold text-amber-600">{data.vehiclesMaintenance}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">متوقفة/شاغرة:</span>
              <span className="font-bold text-rose-500">{data.vehiclesIdle}</span>
            </div>
          </div>
        </div>

        {/* HR & Iqama Alerts */}
        <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">تنبيهات الإقامات</h3>
              <p className="text-[10px] text-muted-foreground">تنتهي قريباً (30 يوم)</p>
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600 mt-2">{data.iqamaAlerts}</p>
          <p className="text-xs text-muted-foreground mt-1">يجب تجديدها لتفادي الإيقاف</p>
        </div>

        {/* Fleet Insurance & Forms */}
        <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ShieldCheck size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">تأمين واستمارات</h3>
              <p className="text-[10px] text-muted-foreground">انقضاء قريباً للمركبات</p>
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{data.insuranceAlerts}</p>
          <p className="text-xs text-muted-foreground mt-1">مركبات تحتاج لتجديد أوراقها</p>
        </div>
      </div>
    </div>
  );
};
