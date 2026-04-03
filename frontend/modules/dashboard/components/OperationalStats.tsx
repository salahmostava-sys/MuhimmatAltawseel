import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Package, Fuel, Wrench,
  Bike, Bell, Award, TrendingUp, CheckCircle, 
  XCircle, AlertCircle, Clock, Calendar,
  type LucideIcon,
} from 'lucide-react';

type OperationalStatsProps = {
  loading: boolean;
  stats: {
    employees: {
      total: number;
      withLicense: number;
      appliedLicense: number;
      noLicense: number;
      byCity: { makkah: number; jeddah: number; other: number };
    };
    attendance: {
      present: number;
      absent: number;
      late: number;
      leave: number;
      sick: number;
      rate: number;
    };
    orders: {
      total: number;
      uniqueRiders: number;
      avgPerRider: number;
    };
    fuel: {
      cost: number;
      liters: number;
      vehiclesRefueled: number;
      avgPerVehicle: number;
    };
    maintenance: {
      cost: number;
      completed: number;
      pending: number;
      vehiclesMaintained: number;
    };
    vehicles: {
      total: number;
      active: number;
      inactive: number;
      maintenance: number;
    };
    alerts: {
      unresolved: number;
      critical: number;
      high: number;
      medium: number;
    };
  };
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
  link,
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  sub?: string;
  link?: string;
  loading?: boolean;
}) => {
  const content = (
    <div className={`bg-card rounded-xl p-4 shadow-sm flex items-center gap-3 transition-all ${link ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : ''}`}>
      {loading ? (
        <>
          <div className="h-12 w-12 rounded-xl bg-muted/40 animate-pulse" />
          <div className="flex-1">
            <div className="h-7 w-20 bg-muted/40 animate-pulse rounded mb-2" />
            <div className="h-3 w-28 bg-muted/40 animate-pulse rounded" />
          </div>
        </>
      ) : (
        <>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
            <Icon size={22} className={color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black text-foreground leading-none mb-1">{value}</p>
            <p className="text-xs font-semibold text-muted-foreground/80 truncate">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">{sub}</p>}
          </div>
        </>
      )}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl shadow-card overflow-hidden">
    <div className="px-5 py-3 border-b border-border bg-muted/30">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export function OperationalStats({ loading, stats }: OperationalStatsProps) {
  return (
    <div className="space-y-5">
      {/* Quick Overview - Top Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="إجمالي الموظفين"
          value={stats.employees.total}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
          link="/employees"
          loading={loading}
        />
        <StatCard
          label="حاضرون اليوم"
          value={stats.attendance.present}
          icon={UserCheck}
          color="text-emerald-600"
          bg="bg-emerald-50"
          sub={`نسبة ${stats.attendance.rate}%`}
          link="/attendance"
          loading={loading}
        />
        <StatCard
          label="طلبات الشهر"
          value={stats.orders.total.toLocaleString()}
          icon={Package}
          color="text-purple-600"
          bg="bg-purple-50"
          sub={`${stats.orders.uniqueRiders} مندوب نشط`}
          link="/orders"
          loading={loading}
        />
        <StatCard
          label="مركبات نشطة"
          value={stats.vehicles.active}
          icon={Bike}
          color="text-orange-600"
          bg="bg-orange-50"
          sub={`من ${stats.vehicles.total} مركبة`}
          link="/vehicles"
          loading={loading}
        />
      </div>

      {/* Main Content - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Column */}
        <div className="space-y-5">
          
          {/* Employees Details */}
          <SectionCard title="تفاصيل الموظفين">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="لديهم رخصة"
                value={stats.employees.withLicense}
                icon={CheckCircle}
                color="text-emerald-600"
                bg="bg-emerald-50"
                sub={`${stats.employees.total > 0 ? Math.round((stats.employees.withLicense / stats.employees.total) * 100) : 0}%`}
                link="/employees"
                loading={loading}
              />
              <StatCard
                label="بدون رخصة"
                value={stats.employees.noLicense}
                icon={XCircle}
                color="text-rose-600"
                bg="bg-rose-50"
                link="/employees"
                loading={loading}
              />
              <StatCard
                label="مكة المكرمة"
                value={stats.employees.byCity.makkah}
                icon={Users}
                color="text-blue-600"
                bg="bg-blue-50"
                link="/employees"
                loading={loading}
              />
              <StatCard
                label="جدة"
                value={stats.employees.byCity.jeddah}
                icon={Users}
                color="text-cyan-600"
                bg="bg-cyan-50"
                link="/employees"
                loading={loading}
              />
            </div>
          </SectionCard>

          {/* Attendance Details */}
          <SectionCard title="تفاصيل الحضور اليوم">
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="غائبون"
                value={stats.attendance.absent}
                icon={XCircle}
                color="text-rose-600"
                bg="bg-rose-50"
                link="/attendance"
                loading={loading}
              />
              <StatCard
                label="متأخرون"
                value={stats.attendance.late}
                icon={Clock}
                color="text-amber-600"
                bg="bg-amber-50"
                link="/attendance"
                loading={loading}
              />
              <StatCard
                label="إجازة"
                value={stats.attendance.leave}
                icon={Calendar}
                color="text-blue-600"
                bg="bg-blue-50"
                link="/attendance"
                loading={loading}
              />
            </div>
          </SectionCard>

          {/* Orders Performance */}
          <SectionCard title="أداء الطلبات">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="مناديب نشطون"
                value={stats.orders.uniqueRiders}
                icon={Users}
                color="text-purple-600"
                bg="bg-purple-50"
                sub="لديهم طلبات"
                link="/orders"
                loading={loading}
              />
              <StatCard
                label="متوسط/مندوب"
                value={stats.orders.avgPerRider}
                icon={Award}
                color="text-amber-600"
                bg="bg-amber-50"
                sub="طلب"
                link="/orders"
                loading={loading}
              />
            </div>
          </SectionCard>

        </div>

        {/* Right Column */}
        <div className="space-y-5">
          
          {/* Vehicles Status */}
          <SectionCard title="حالة المركبات">
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="نشطة"
                value={stats.vehicles.active}
                icon={CheckCircle}
                color="text-emerald-600"
                bg="bg-emerald-50"
                link="/vehicles"
                loading={loading}
              />
              <StatCard
                label="في الصيانة"
                value={stats.vehicles.maintenance}
                icon={Wrench}
                color="text-amber-600"
                bg="bg-amber-50"
                link="/vehicles"
                loading={loading}
              />
              <StatCard
                label="غير نشطة"
                value={stats.vehicles.inactive}
                icon={XCircle}
                color="text-slate-600"
                bg="bg-slate-50"
                link="/vehicles"
                loading={loading}
              />
            </div>
          </SectionCard>

          {/* Fuel & Maintenance */}
          <SectionCard title="الوقود والصيانة">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <StatCard
                label="تكلفة الوقود"
                value={`${stats.fuel.cost.toLocaleString()} ر.س`}
                icon={Fuel}
                color="text-orange-600"
                bg="bg-orange-50"
                sub={`${stats.fuel.liters.toLocaleString()} لتر`}
                link="/fuel"
                loading={loading}
              />
              <StatCard
                label="مركبات تم تعبئتها"
                value={stats.fuel.vehiclesRefueled}
                icon={Fuel}
                color="text-blue-600"
                bg="bg-blue-50"
                sub={`متوسط ${stats.fuel.avgPerVehicle} ر.س`}
                link="/fuel"
                loading={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="تكلفة الصيانة"
                value={`${stats.maintenance.cost.toLocaleString()} ر.س`}
                icon={Wrench}
                color="text-purple-600"
                bg="bg-purple-50"
                sub="هذا الشهر"
                link="/maintenance"
                loading={loading}
              />
              <StatCard
                label="صيانة معلقة"
                value={stats.maintenance.pending}
                icon={Clock}
                color="text-rose-600"
                bg="bg-rose-50"
                sub={`${stats.maintenance.completed} مكتملة`}
                link="/maintenance"
                loading={loading}
              />
            </div>
          </SectionCard>

          {/* Alerts */}
          <SectionCard title="التنبيهات">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <StatCard
                label="غير محلولة"
                value={stats.alerts.unresolved}
                icon={Bell}
                color="text-amber-600"
                bg="bg-amber-50"
                link="/alerts"
                loading={loading}
              />
              <StatCard
                label="محلولة"
                value={stats.alerts.resolved}
                icon={CheckCircle}
                color="text-emerald-600"
                bg="bg-emerald-50"
                link="/alerts"
                loading={loading}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="حرجة"
                value={stats.alerts.critical}
                icon={AlertCircle}
                color="text-rose-600"
                bg="bg-rose-50"
                link="/alerts"
                loading={loading}
              />
              <StatCard
                label="عالية"
                value={stats.alerts.high}
                icon={AlertCircle}
                color="text-orange-600"
                bg="bg-orange-50"
                link="/alerts"
                loading={loading}
              />
              <StatCard
                label="متوسطة"
                value={stats.alerts.medium}
                icon={AlertCircle}
                color="text-amber-600"
                bg="bg-amber-50"
                link="/alerts"
                loading={loading}
              />
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
