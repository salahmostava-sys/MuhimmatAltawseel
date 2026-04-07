import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  DollarSign,
  Layers,
  PieChart,
  Settings,
  Search,
  Bell,
  Menu,
  TrendingUp,
  Activity,
  Car,
  Package,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "لوحة التحكم", active: true },
  { icon: ShoppingBag, label: "الطلبات" },
  { icon: Users, label: "السائقون" },
  { icon: DollarSign, label: "الرواتب" },
  { icon: Layers, label: "المنصات" },
  { icon: PieChart, label: "التقارير" },
  { icon: Settings, label: "الإعدادات" },
];

const STATS = [
  {
    label: "إجمالي الطلبات",
    value: "٢٤٧",
    trend: "+١٢٪",
    isPositive: true,
    icon: Package,
    color: "from-indigo-500 to-blue-500",
  },
  {
    label: "السائقون النشطون",
    value: "١٨",
    trend: "+٢",
    isPositive: true,
    icon: Car,
    color: "from-emerald-400 to-teal-500",
  },
  {
    label: "إجمالي الإيرادات",
    value: "٨٤,٢٠٠ ر.س",
    trend: "+٨.٥٪",
    isPositive: true,
    icon: Activity,
    color: "from-purple-500 to-pink-500",
  },
  {
    label: "معدل التوصيل",
    value: "٩٤٪",
    trend: "-١٪",
    isPositive: false,
    icon: TrendingUp,
    color: "from-rose-400 to-red-500",
  },
];

const RECENT_ORDERS = [
  { id: "#ORD-8439", driver: "أحمد محمد", platform: "هنقرستيشن", amount: "١٢٠ ر.س", status: "مكتمل", date: "منذ ١٠ دقائق" },
  { id: "#ORD-8440", driver: "خالد عبدالله", platform: "طلبات", amount: "٨٥ ر.س", status: "قيد التنفيذ", date: "منذ ١٥ دقيقة" },
  { id: "#ORD-8441", driver: "ياسر سعد", platform: "جاهز", amount: "٢١٠ ر.س", status: "مكتمل", date: "منذ ٣٢ دقيقة" },
  { id: "#ORD-8442", driver: "فهد ناصر", platform: "هنقرستيشن", amount: "٦٥ ر.س", status: "ملغي", date: "منذ ساعة" },
  { id: "#ORD-8443", driver: "عمر فهد", platform: "مرسول", amount: "١٤٠ ر.س", status: "قيد التنفيذ", date: "منذ ساعتين" },
];

const STATUS_STYLES = {
  "مكتمل": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "قيد التنفيذ": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "ملغي": "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function Dashboard() {
  return (
    <div
      dir="rtl"
      className="flex h-screen min-h-[100dvh] w-full bg-[#0b0d14] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle at 50% 0%, #1e1b4b 0%, transparent 70%)",
      }}
    >
      {/* Sidebar */}
      <aside className="w-72 hidden lg:flex flex-col bg-[#11131e]/80 backdrop-blur-xl border-l border-white/5 z-20 relative shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">مهمة التوصيل</h1>
            <p className="text-xs text-indigo-300">نظام إدارة الأسطول</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-500 mb-4 tracking-wider">القائمة الرئيسية</p>
          {SIDEBAR_ITEMS.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                item.active
                  ? "bg-indigo-500/10 text-indigo-400 relative overflow-hidden"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {item.active && (
                <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              )}
              <item.icon className={`w-5 h-5 transition-transform duration-300 ${item.active ? "scale-110" : "group-hover:scale-110"}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=4f46e5"
              alt="User"
              className="w-10 h-10 rounded-full bg-indigo-950"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">أحمد محمود</p>
              <p className="text-xs text-slate-400 truncate">مدير النظام</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-[#0b0d14]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none px-4">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن طلب، سائق، أو منصة..."
                className="w-96 bg-[#11131e] border border-white/10 rounded-xl py-2.5 pr-11 pl-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-[#0b0d14]"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">نظرة عامة على الأداء</h2>
              <p className="text-slate-400 text-sm">مرحباً بعودتك، إليك ملخص لأداء اليوم.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className="bg-[#11131e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 hover:bg-[#11131e]/80 transition-all duration-500"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br opacity-20 blur-2xl rounded-full group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `var(--tw-gradient-stops)` }} />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-white shadow-inner">
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                      stat.isPositive 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {stat.trend}
                    </span>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
                    <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                  </div>
                  
                  {/* Bottom glowing line */}
                  <div className={`absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r ${stat.color} opacity-50`} />
                </div>
              ))}
            </div>

            {/* Main Area: Chart & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart Placeholder */}
              <div className="lg:col-span-2 bg-[#11131e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/10 transition-colors">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-lg text-white">إحصائيات الطلبات (هذا الأسبوع)</h3>
                  <select className="bg-[#0b0d14] border border-white/10 text-sm rounded-xl px-3 py-1.5 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option>آخر ٧ أيام</option>
                    <option>هذا الشهر</option>
                  </select>
                </div>
                
                <div className="flex-1 flex items-end justify-between gap-4 h-64 mt-auto pt-8 border-b border-white/5 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className="w-full h-[1px] bg-white/5" />
                    ))}
                  </div>
                  
                  {/* Bars */}
                  {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, i) => {
                    const heights = [40, 65, 45, 80, 55, 95, 75];
                    return (
                      <div key={day} className="flex flex-col items-center gap-3 w-full group relative z-10">
                        <div className="w-full max-w-[48px] bg-white/5 rounded-t-xl overflow-hidden relative flex items-end h-full">
                          <div 
                            className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl group-hover:opacity-80 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            style={{ height: `${heights[i]}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity / Quick Actions */}
              <div className="bg-[#11131e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/10 transition-colors">
                 <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-white">المنصات النشطة</h3>
                  <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300">عرض الكل</button>
                </div>
                
                <div className="space-y-5">
                  {[
                    { name: 'هنقرستيشن', orders: '١٢٤ طلب', share: 65, color: 'bg-yellow-500' },
                    { name: 'جاهز', orders: '٨٥ طلب', share: 45, color: 'bg-rose-500' },
                    { name: 'مرسول', orders: '٣٨ طلب', share: 20, color: 'bg-emerald-500' },
                  ].map((platform) => (
                    <div key={platform.name} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-200">{platform.name}</span>
                        <span className="text-slate-400">{platform.orders}</span>
                      </div>
                      <div className="h-2 bg-[#0b0d14] rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full ${platform.color} rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]`} style={{ width: `${platform.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                   <button className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2">
                     <Package className="w-4 h-4" />
                     طلب جديد
                   </button>
                </div>
              </div>

            </div>

            {/* Table Area */}
            <div className="bg-[#11131e]/60 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg text-white">أحدث الطلبات</h3>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium rounded-xl text-slate-300 transition-colors">
                  تصدير التقرير
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/5 bg-[#0b0d14]/50">
                      <th className="font-medium py-4 px-6">رقم الطلب</th>
                      <th className="font-medium py-4 px-6">السائق</th>
                      <th className="font-medium py-4 px-6">المنصة</th>
                      <th className="font-medium py-4 px-6">المبلغ</th>
                      <th className="font-medium py-4 px-6">تاريخ الطلب</th>
                      <th className="font-medium py-4 px-6">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {RECENT_ORDERS.map((order, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6 font-medium text-slate-200">{order.id}</td>
                        <td className="py-4 px-6 text-slate-300">{order.driver}</td>
                        <td className="py-4 px-6 text-slate-300">{order.platform}</td>
                        <td className="py-4 px-6 font-medium text-white">{order.amount}</td>
                        <td className="py-4 px-6 text-slate-400">{order.date}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status as keyof typeof STATUS_STYLES]}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
