import React from "react";
import { 
  BarChart3, 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  LayoutDashboard,
  Wallet,
  Smartphone,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Truck
} from "lucide-react";

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 w-72 bg-white border-l border-slate-200 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-3 text-emerald-600">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Truck size={20} className="text-emerald-600" />
            </div>
            <span className="text-xl font-bold tracking-tight">مهمة التوصيل</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="لوحة التحكم" active />
          <NavItem icon={<Package size={20} />} label="الطلبات" badge="١٢" />
          <NavItem icon={<Users size={20} />} label="السائقون" />
          <NavItem icon={<Wallet size={20} />} label="الرواتب" />
          <NavItem icon={<Smartphone size={20} />} label="المنصات" />
          <NavItem icon={<FileText size={20} />} label="التقارير" />
          
          <div className="pt-6 pb-2">
            <div className="text-xs font-semibold text-slate-400 px-4 mb-2 uppercase tracking-wider">الإدارة</div>
            <NavItem icon={<Settings size={20} />} label="الإعدادات" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
              أ.م
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">أحمد محمد</div>
              <div className="text-xs text-slate-500 truncate">مدير النظام</div>
            </div>
            <MoreVertical size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-[100dvh]">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">نظرة عامة</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث في الطلبات..." 
                className="w-64 pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-600/20 hidden sm:block">
              + طلب جديد
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">إحصائيات اليوم</h2>
            <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <span>١٥ مايو ٢٠٢٤</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard 
              title="إجمالي الطلبات" 
              value="٢٤٧" 
              icon={<Package size={24} className="text-blue-600" />}
              iconBg="bg-blue-100"
              trend="+١٢٪"
              trendUp={true}
            />
            <StatCard 
              title="السائقون النشطون" 
              value="١٨" 
              icon={<Users size={24} className="text-emerald-600" />}
              iconBg="bg-emerald-100"
              trend="+٢"
              trendUp={true}
              subtitle="من أصل ٢٤"
            />
            <StatCard 
              title="إجمالي الإيرادات" 
              value="٨٤,٢٠٠" 
              currency="ر.س"
              icon={<DollarSign size={24} className="text-amber-600" />}
              iconBg="bg-amber-100"
              trend="+٨.٤٪"
              trendUp={true}
            />
            <StatCard 
              title="معدل التوصيل" 
              value="٩٤٪" 
              icon={<BarChart3 size={24} className="text-indigo-600" />}
              iconBg="bg-indigo-100"
              trend="-٢٪"
              trendUp={false}
              subtitle="في الوقت المحدد"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-bold text-slate-800">حجم الطلبات الأسبوعي</h3>
                <select className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer">
                  <option>هذا الأسبوع</option>
                  <option>الأسبوع الماضي</option>
                </select>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 mt-auto">
                {[
                  { label: 'السبت', h: '40%', value: '١٢٠' },
                  { label: 'الأحد', h: '65%', value: '١٩٥' },
                  { label: 'الإثنين', h: '50%', value: '١٥٠' },
                  { label: 'الثلاثاء', h: '85%', value: '٢٥٥' },
                  { label: 'الأربعاء', h: '70%', value: '٢١٠' },
                  { label: 'الخميس', h: '95%', active: true, value: '٢٨٥' },
                  { label: 'الجمعة', h: '60%', value: '١٨٠' },
                ].map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1 group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded font-medium whitespace-nowrap pointer-events-none">
                      {bar.value} طلب
                    </div>
                    <div className="w-full relative h-full flex items-end justify-center">
                      <div 
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 ${bar.active ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-emerald-200'}`}
                        style={{ height: bar.h }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${bar.active ? 'text-emerald-700' : 'text-slate-500'}`}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">أفضل السائقين</h3>
                <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700">عرض الكل</button>
              </div>
              <div className="p-2 flex-1">
                {[
                  { name: 'محمد علي', orders: '٤٢ طلب', rating: '٤.٩', avatar: 'م' },
                  { name: 'عبدالله خالد', orders: '٣٨ طلب', rating: '٤.٨', avatar: 'ع' },
                  { name: 'سعد فهد', orders: '٣٥ طلب', rating: '٤.٩', avatar: 'س' },
                  { name: 'عمر ياسر', orders: '٣١ طلب', rating: '٤.٧', avatar: 'ع' },
                  { name: 'خالد سعود', orders: '٢٩ طلب', rating: '٤.٦', avatar: 'خ' },
                ].map((driver, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {driver.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{driver.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{driver.orders}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-amber-500 font-medium flex items-center gap-0.5">
                          <span>★</span> {driver.rating}
                        </span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' : 
                        i === 1 ? 'bg-slate-200 text-slate-700' : 
                        i === 2 ? 'bg-orange-100 text-orange-800' : 
                        'bg-slate-50 text-slate-500'}`}
                    >
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">أحدث الطلبات</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="بحث..." 
                    className="w-48 pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 hidden sm:block"
                  />
                </div>
                <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"><MoreVertical size={18} /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3.5">رقم الطلب</th>
                    <th className="px-6 py-3.5">العميل</th>
                    <th className="px-6 py-3.5">المنصة</th>
                    <th className="px-6 py-3.5">السائق</th>
                    <th className="px-6 py-3.5">المبلغ</th>
                    <th className="px-6 py-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <OrderRow id="#ORD-8432" customer="فهد عبدالرحمن" platform="Talabat" driver="محمد علي" amount="١٢٥ ر.س" status="مكتمل" />
                  <OrderRow id="#ORD-8431" customer="نورة السالم" platform="HungerStation" driver="سعد فهد" amount="٨٥ ر.س" status="قيد التنفيذ" />
                  <OrderRow id="#ORD-8430" customer="عبدالعزيز محمد" platform="Jahez" driver="-" amount="٤٥ ر.س" status="ملغي" />
                  <OrderRow id="#ORD-8429" customer="سارة خالد" platform="Talabat" driver="عبدالله خالد" amount="٢١٠ ر.س" status="مكتمل" />
                  <OrderRow id="#ORD-8428" customer="تركي العتيبي" platform="HungerStation" driver="-" amount="٦٥ ر.س" status="قيد التنفيذ" />
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
              <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">عرض جميع الطلبات (٢٤٧)</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <a href="#" className={`
      flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group
      ${active 
        ? 'bg-emerald-50 text-emerald-700 font-bold' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}
    `}>
      <div className="flex items-center gap-3">
        <div className={`${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </a>
  );
}

function StatCard({ title, value, currency, icon, iconBg, trend, trendUp, subtitle }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          <span dir="ltr">{trend}</span>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
      </div>
      <div>
        <h4 className="text-slate-500 text-sm font-medium mb-1.5">{title}</h4>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
          {currency && <span className="text-sm font-bold text-slate-500">{currency}</span>}
          {subtitle && <span className="text-xs font-medium text-slate-400 mr-2 border-r border-slate-200 pr-2">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ id, customer, platform, driver, amount, status }: any) {
  
  let statusUI;
  if (status === 'مكتمل') {
    statusUI = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100/50"><CheckCircle2 size={12} /> {status}</span>;
  } else if (status === 'قيد التنفيذ') {
    statusUI = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/50"><Clock size={12} /> {status}</span>;
  } else {
    statusUI = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100/50"><XCircle size={12} /> {status}</span>;
  }

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="font-mono text-sm font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">{id}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-slate-800">{customer}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{platform}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`text-sm ${driver === '-' ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>{driver}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-bold text-slate-800">{amount}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {statusUI}
      </td>
    </tr>
  );
}
