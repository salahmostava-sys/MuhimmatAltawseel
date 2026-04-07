import React from "react";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Wallet, 
  Layers, 
  BarChart3, 
  Settings, 
  Plus, 
  Search,
  Star,
  MoreHorizontal
} from "lucide-react";

export function Dashboard() {
  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans text-slate-900 flex selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f8f9fa] border-l border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="w-6 h-6 bg-indigo-600 rounded-sm flex items-center justify-center ml-3">
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">مهمة التوصيل</span>
        </div>

        <nav className="flex-1 py-4 space-y-0.5">
          <NavItem icon={<LayoutDashboard size={18} />} label="لوحة التحكم" active />
          <NavItem icon={<Package size={18} />} label="الطلبات" />
          <NavItem icon={<Users size={18} />} label="السائقون" />
          <NavItem icon={<Wallet size={18} />} label="الرواتب" />
          <NavItem icon={<Layers size={18} />} label="المنصات" />
          <NavItem icon={<BarChart3 size={18} />} label="التقارير" />
        </nav>

        <div className="py-4 border-t border-gray-200">
          <NavItem icon={<Settings size={18} />} label="الإعدادات" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 px-8 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">لوحة التحكم</h1>
            <span className="text-slate-400 text-sm">الأربعاء، 24 أكتوبر 2023</span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus size={16} />
            <span>طلب جديد</span>
          </button>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard label="طلب هذا الشهر" value="2,847" />
              <KpiCard label="سائق نشط" value="23" />
              <KpiCard label="إيرادات (ر.س)" value="127,400" />
              <KpiCard label="معدل الإنجاز" value="96%" />
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Platform Breakdown */}
              <div className="border border-gray-200 p-6 flex flex-col rounded-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold">توزيع المنصات</h2>
                  <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
                </div>
                <div className="space-y-6 flex-1">
                  <PlatformBar name="طلبات" percentage={45} value="1,281" />
                  <PlatformBar name="هنقرستيشن" percentage={32} value="911" />
                  <PlatformBar name="جاهز" percentage={15} value="427" />
                  <PlatformBar name="أخرى" percentage={8} value="228" />
                </div>
              </div>

              {/* Top Drivers Table */}
              <div className="lg:col-span-2 border border-gray-200 p-6 rounded-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold">أفضل السائقين أداءً</h2>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="بحث عن سائق..." 
                      className="w-48 pl-3 pr-9 py-1.5 bg-slate-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-indigo-600 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table dir="rtl" className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-gray-200 text-slate-500">
                        <th className="pb-3 font-medium px-4">السائق</th>
                        <th className="pb-3 font-medium px-4">الطلبات</th>
                        <th className="pb-3 font-medium px-4">التقييم</th>
                        <th className="pb-3 font-medium px-4">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DriverRow name="أحمد محمد" orders="342" rating="4.9" status="active" />
                      <DriverRow name="خالد عبدالله" orders="315" rating="4.8" status="active" />
                      <DriverRow name="سعد فهد" orders="289" rating="4.7" status="offline" />
                      <DriverRow name="عمر عبدالعزيز" orders="276" rating="4.9" status="active" />
                      <DriverRow name="فيصل عبدالرحمن" orders="254" rating="4.6" status="active" />
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors border-r-2 ${
        active 
          ? "bg-indigo-600/10 text-indigo-600 border-indigo-600" 
          : "text-slate-600 hover:bg-gray-200 hover:text-slate-900 border-transparent"
      }`}
    >
      <span className="ml-3">{icon}</span>
      {label}
    </a>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 p-6 flex flex-col justify-between h-44 rounded-sm">
      <div className="text-slate-500 font-medium text-sm">{label}</div>
      <div className="text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mt-4 leading-none">
        {value}
      </div>
    </div>
  );
}

function PlatformBar({ name, percentage, value }: { name: string; percentage: number; value: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-700">{name}</span>
        <span className="text-slate-500 font-medium">{percentage}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 overflow-hidden rounded-sm">
        <div 
          className="h-full bg-indigo-600" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DriverRow({ name, orders, rating, status }: { name: string; orders: string; rating: string; status: 'active' | 'offline' }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
      <td className="py-4 px-4 font-medium text-slate-900">{name}</td>
      <td className="py-4 px-4 text-slate-600">{orders}</td>
      <td className="py-4 px-4">
        <div className="flex items-center text-slate-900 font-medium">
          {rating}
          <Star size={14} className="text-slate-300 fill-slate-300 ml-1.5" />
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-slate-500 font-medium">{status === 'active' ? 'نشط' : 'غير متصل'}</span>
        </div>
      </td>
    </tr>
  );
}