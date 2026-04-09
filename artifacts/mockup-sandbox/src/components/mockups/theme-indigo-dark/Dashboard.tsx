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
  Package,
  Clock,
  ChevronDown
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
    value: "2,847",
    trend: "+12.5%",
    isPositive: true,
    icon: Package,
  },
  {
    label: "السائقون النشطون",
    value: "23",
    trend: "+3",
    isPositive: true,
    icon: Users,
  },
  {
    label: "الإيرادات",
    value: "127,400 ر.س",
    trend: "+8.2%",
    isPositive: true,
    icon: DollarSign,
  },
  {
    label: "التوصيل في الوقت",
    value: "96.2%",
    trend: "-1.4%",
    isPositive: false,
    icon: Clock,
  },
];

const ORDERS = [
  { id: "#ORD-9012", driver: "أحمد محمود", platform: "هنقرستيشن", status: "مكتمل", amount: "145 ر.س" },
  { id: "#ORD-9013", driver: "خالد سعيد", platform: "جاهز", status: "جاري التوصيل", amount: "89 ر.س" },
  { id: "#ORD-9014", driver: "فهد عبدالله", platform: "مرسول", status: "معلق", amount: "210 ر.س" },
  { id: "#ORD-9015", driver: "ياسر محمد", platform: "تويو", status: "مكتمل", amount: "65 ر.س" },
  { id: "#ORD-9016", driver: "سعد ناصر", platform: "هنقرستيشن", status: "جاري التوصيل", amount: "120 ر.س" },
];

const STATUS_STYLES = {
  "مكتمل": "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
  "جاري التوصيل": "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
  "معلق": "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
};

export function Dashboard() {
  return (
    <div
      dir="rtl"
      className="flex h-screen min-h-[100dvh] w-full bg-[#0a0a0f] text-slate-200 font-sans overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.05) 40%, #0a0a0f 80%)",
      }}
    >
      {/* Sidebar */}
      <aside 
        className="w-72 hidden lg:flex flex-col border-l border-white/10 z-20 relative"
        style={{ background: "rgba(10, 10, 15, 0.6)", backdropFilter: "blur(20px)" }}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">مهمة التوصيل</h1>
            <p className="text-[10px] text-[#06b6d4] font-medium tracking-widest uppercase">نظام الإدارة</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-500/70 mb-4 tracking-wider">القائمة الرئيسية</p>
          {SIDEBAR_ITEMS.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                item.active
                  ? "bg-gradient-to-r from-[#7c3aed]/20 to-transparent text-white border-r-2 border-[#06b6d4]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 ${item.active ? "text-[#06b6d4]" : "group-hover:scale-110"}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10" style={{ backdropFilter: "blur(10px)" }}>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#06b6d4] p-[2px]">
               <div className="w-full h-full rounded-full bg-[#0a0a0f] flex items-center justify-center">
                 <span className="text-white text-sm font-bold">أ.ح</span>
               </div>
             </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">أحمد حسن</p>
              <p className="text-xs text-[#06b6d4] truncate">مدير النظام</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Header */}
        <header 
          className="h-20 flex items-center justify-between px-8 border-b border-white/10 sticky top-0 z-30"
          style={{ background: "rgba(10, 10, 15, 0.4)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none px-4">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#06b6d4] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن طلب، سائق، أو منصة..."
                className="w-80 bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06b6d4]/50 focus:border-[#06b6d4]/50 transition-all shadow-inner"
                style={{ backdropFilter: "blur(10px)" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#06b6d4] rounded-full shadow-[0_0_8px_#06b6d4]"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">نظرة عامة على الأداء</h2>
              <p className="text-slate-400 text-sm">مرحباً بعودتك، إليك ملخص لعمليات التوصيل اليوم.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 border border-white/10"
                  style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(20px)" }}
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#7c3aed] opacity-10 blur-3xl rounded-full group-hover:opacity-20 transition-opacity duration-500" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white shadow-inner group-hover:border-white/20 transition-colors">
                      <stat.icon className="w-5 h-5 text-[#06b6d4]" />
                    </div>
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1 ${
                      stat.isPositive 
                        ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                        : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                    }`}>
                      {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                      <span>{stat.trend}</span>
                    </span>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">{stat.label}</h3>
                    <p className="text-3xl font-bold text-white tracking-tight font-mono">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Area: Chart & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart */}
              <div 
                className="lg:col-span-2 border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(20px)" }}
              >
                <div className="absolute -left-20 top-1/2 w-40 h-40 bg-[#06b6d4] opacity-5 blur-[100px] rounded-full" />
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <div>
                    <h3 className="font-bold text-base text-white">إحصائيات الطلبات</h3>
                    <p className="text-xs text-slate-400 mt-1">آخر ٧ أيام</p>
                  </div>
                  <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span>هذا الأسبوع</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex-1 flex items-end justify-between gap-4 h-64 mt-auto pt-8 border-b border-white/10 relative z-10">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className="w-full h-[1px] bg-white/5 border-b border-dashed border-white/5" />
                    ))}
                  </div>
                  
                  {/* Bars */}
                  {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, i) => {
                    const heights = [45, 65, 50, 85, 60, 95, 75];
                    return (
                      <div key={day} className="flex flex-col items-center gap-3 w-full group relative z-10">
                        <div className="w-full max-w-[40px] bg-white/5 rounded-t-lg overflow-hidden relative flex items-end h-full">
                          <div 
                            className="w-full bg-gradient-to-t from-[#7c3aed] to-[#06b6d4] rounded-t-lg group-hover:opacity-80 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                            style={{ height: `${heights[i]}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status List */}
              <div 
                className="border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(20px)" }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-base text-white">المنصات النشطة</h3>
                  <button className="text-[#06b6d4] text-xs font-medium hover:text-white transition-colors">عرض الكل</button>
                </div>
                
                <div className="space-y-6">
                  {[
                    { name: 'هنقرستيشن', orders: '420', percent: '65%', color: 'from-yellow-400 to-yellow-600', shadow: 'rgba(234, 179, 8, 0.4)' },
                    { name: 'جاهز', orders: '185', percent: '25%', color: 'from-rose-400 to-rose-600', shadow: 'rgba(225, 29, 72, 0.4)' },
                    { name: 'مرسول', orders: '84', percent: '10%', color: 'from-emerald-400 to-emerald-600', shadow: 'rgba(52, 211, 153, 0.4)' },
                  ].map((platform) => (
                    <div key={platform.name} className="space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-200">{platform.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-xs">{platform.orders} طلب</span>
                          <span className="text-white font-mono">{platform.percent}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${platform.color} rounded-full`} 
                          style={{ width: platform.percent, boxShadow: `0 0 10px ${platform.shadow}` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                   <button className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all flex justify-center items-center gap-2 group">
                     <span className="group-hover:text-[#06b6d4] transition-colors">تصدير التقرير</span>
                   </button>
                </div>
              </div>

            </div>

            {/* Table Area */}
            <div 
              className="border border-white/10 rounded-3xl overflow-hidden"
              style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(20px)" }}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-base text-white">أحدث الطلبات</h3>
                <div className="flex gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table dir="rtl" className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10 bg-white/5">
                      <th className="font-medium py-4 px-6 uppercase text-xs tracking-wider">رقم الطلب</th>
                      <th className="font-medium py-4 px-6 uppercase text-xs tracking-wider">السائق</th>
                      <th className="font-medium py-4 px-6 uppercase text-xs tracking-wider">المنصة</th>
                      <th className="font-medium py-4 px-6 uppercase text-xs tracking-wider">الحالة</th>
                      <th className="font-medium py-4 px-6 uppercase text-xs tracking-wider">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {ORDERS.map((order, i) => (
                      <tr key={i} className="hover:bg-white/[0.04] transition-colors group">
                        <td className="py-4 px-6 font-mono text-[#06b6d4]">{order.id}</td>
                        <td className="py-4 px-6 text-slate-200 font-medium">{order.driver}</td>
                        <td className="py-4 px-6 text-slate-400">{order.platform}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status as keyof typeof STATUS_STYLES]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-white">{order.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

export default Dashboard;
