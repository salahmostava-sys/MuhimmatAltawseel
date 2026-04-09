import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Package, Fuel, Wrench, AlertTriangle,
  DollarSign, Bike, Bell, Smartphone, Award, TrendingUp,
  Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  type LucideIcon,
} from 'lucide-react';

type ComprehensiveStatsProps = {
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
    violations: {
      count: number;
      cost: number;
      employeesWithViolations: number;
    };
    advances: {
      count: number;
      totalAmount: number;
      remainingAmount: number;
      employeesWithAdvances: number;
    };
    salaries: {
      approved: number;
      pending: number;
      totalNet: number;
      avgSalary: number;
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
    apps: {
      active: number;
      inactive: number;
    };
    platformAccounts: {
      active: number;
      inactive: number;
      employeesWithAccounts: number;
    };
    spareParts: {
      lowStock: number;
      total: number;
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
    <div className={`bg-card rounded-xl p-3 shadow-sm flex items-center gap-3 transition-all ${link ? 'hover:shadow-md cursor-pointer' : ''}`}>
      {loading ? (
        <>
          <div className="h-10 w-10 rounded-lg bg-muted/40 animate-pulse" />
          <div className="flex-1">
            <div className="h-6 w-16 bg-muted/40 animate-pulse rounded mb-1" />
            <div className="h-3 w-24 bg-muted/40 animate-pulse rounded" />
          </div>
        </>
      ) : (
        <>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
            <Icon size={18} className={color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-foreground leading-none">{value}</p>
            <p className="text-[11px] font-semibold text-muted-foreground/80 mt-0.5 truncate">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{sub}</p>}
          </div>
        </>
      )}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: LucideIcon }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon size={18} className="text-primary" />
    <h3 className="text-sm font-bold text-foreground">{title}</h3>
  </div>
);

export function ComprehensiveStats({ loading, stats }: ComprehensiveStatsProps) {
  return (
    <div className="space-y-6">
      {/* Employees Section */}
      <div>
        <SectionTitle title="الموظفين" icon={Users} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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
            label="لديهم رخصة"
            value={stats.employees.withLicense}
            icon={CheckCircle}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`${stats.employees.total > 0 ? Math.round((stats.employees.withLicense / stats.employees.total) * 100) : 0}% من الإجمالي`}
            link="/employees"
            loading={loading}
          />
          <StatCard
            label="تقدموا للرخصة"
            value={stats.employees.appliedLicense}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50"
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
            label="مكة / جدة"
            value={`${stats.employees.byCity.makkah} / ${stats.employees.byCity.jeddah}`}
            icon={Users}
            color="text-purple-600"
            bg="bg-purple-50"
            sub={`${stats.employees.byCity.other} مدن أخرى`}
            link="/employees"
            loading={loading}
          />
        </div>
      </div>

      {/* Attendance Section */}
      <div>
        <SectionTitle title="الحضور اليوم" icon={UserCheck} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="حاضرون"
            value={stats.attendance.present}
            icon={CheckCircle}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`نسبة ${stats.attendance.rate}%`}
            link="/attendance"
            loading={loading}
          />
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
          <StatCard
            label="مرضي"
            value={stats.attendance.sick}
            icon={AlertCircle}
            color="text-orange-600"
            bg="bg-orange-50"
            link="/attendance"
            loading={loading}
          />
          <StatCard
            label="معدل الحضور"
            value={`${stats.attendance.rate}%`}
            icon={TrendingUp}
            color="text-primary"
            bg="bg-primary/10"
            link="/attendance"
            loading={loading}
          />
        </div>
      </div>

      {/* Orders Section */}
      <div>
        <SectionTitle title="الطلبات" icon={Package} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="إجمالي الطلبات"
            value={stats.orders.total.toLocaleString()}
            icon={Package}
            color="text-blue-600"
            bg="bg-blue-50"
            sub="هذا الشهر"
            link="/orders"
            loading={loading}
          />
          <StatCard
            label="مناديب نشطون"
            value={stats.orders.uniqueRiders}
            icon={Users}
            color="text-emerald-600"
            bg="bg-emerald-50"
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
            sub="طلب لكل مندوب"
            link="/orders"
            loading={loading}
          />
        </div>
      </div>

      {/* Vehicles & Fuel Section */}
      <div>
        <SectionTitle title="المركبات والوقود" icon={Bike} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="مركبات نشطة"
            value={stats.vehicles.active}
            icon={Bike}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`من ${stats.vehicles.total} مركبة`}
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
      </div>

      {/* Finance Section */}
      <div>
        <SectionTitle title="المالية" icon={DollarSign} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard
            label="رواتب معتمدة"
            value={`${stats.salaries.totalNet.toLocaleString()} ر.س`}
            icon={DollarSign}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`${stats.salaries.approved} موظف`}
            link="/salaries"
            loading={loading}
          />
          <StatCard
            label="رواتب معلقة"
            value={stats.salaries.pending}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50"
            sub="تحتاج اعتماد"
            link="/salaries"
            loading={loading}
          />
          <StatCard
            label="متوسط الراتب"
            value={`${stats.salaries.avgSalary.toLocaleString()} ر.س`}
            icon={Award}
            color="text-blue-600"
            bg="bg-blue-50"
            link="/salaries"
            loading={loading}
          />
          <StatCard
            label="سلف نشطة"
            value={`${stats.advances.totalAmount.toLocaleString()} ر.س`}
            icon={DollarSign}
            color="text-orange-600"
            bg="bg-orange-50"
            sub={`${stats.advances.count} سلفة`}
            link="/advances"
            loading={loading}
          />
          <StatCard
            label="متبقي من السلف"
            value={`${stats.advances.remainingAmount.toLocaleString()} ر.س`}
            icon={Clock}
            color="text-purple-600"
            bg="bg-purple-50"
            sub={`${stats.advances.employeesWithAdvances} موظف`}
            link="/advances"
            loading={loading}
          />
        </div>
      </div>

      {/* Violations & Alerts Section */}
      <div>
        <SectionTitle title="المخالفات والتنبيهات" icon={AlertTriangle} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="مخالفات معلقة"
            value={stats.violations.count}
            icon={AlertTriangle}
            color="text-rose-600"
            bg="bg-rose-50"
            sub={`${stats.violations.cost.toLocaleString()} ر.س`}
            link="/violations"
            loading={loading}
          />
          <StatCard
            label="موظفون بمخالفات"
            value={stats.violations.employeesWithViolations}
            icon={Users}
            color="text-orange-600"
            bg="bg-orange-50"
            link="/violations"
            loading={loading}
          />
          <StatCard
            label="تنبيهات غير محلولة"
            value={stats.alerts.unresolved}
            icon={Bell}
            color="text-amber-600"
            bg="bg-amber-50"
            link="/alerts"
            loading={loading}
          />
          <StatCard
            label="حرجة"
            value={stats.alerts.critical}
            icon={AlertCircle}
            color="text-rose-600"
            bg="bg-rose-50"
            sub="تحتاج تدخل فوري"
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
      </div>

      {/* Apps & Accounts Section */}
      <div>
        <SectionTitle title="المنصات والحسابات" icon={Smartphone} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="منصات نشطة"
            value={stats.apps.active}
            icon={Smartphone}
            color="text-emerald-600"
            bg="bg-emerald-50"
            sub={`${stats.apps.inactive} غير نشطة`}
            link="/apps"
            loading={loading}
          />
          <StatCard
            label="حسابات نشطة"
            value={stats.platformAccounts.active}
            icon={CheckCircle}
            color="text-blue-600"
            bg="bg-blue-50"
            sub={`${stats.platformAccounts.inactive} غير نشطة`}
            link="/platform-accounts"
            loading={loading}
          />
          <StatCard
            label="موظفون بحسابات"
            value={stats.platformAccounts.employeesWithAccounts}
            icon={Users}
            color="text-purple-600"
            bg="bg-purple-50"
            link="/platform-accounts"
            loading={loading}
          />
          <StatCard
            label="قطع غيار منخفضة"
            value={stats.spareParts.lowStock}
            icon={AlertTriangle}
            color="text-rose-600"
            bg="bg-rose-50"
            sub={`من ${stats.spareParts.total} صنف`}
            link="/spare-parts"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
