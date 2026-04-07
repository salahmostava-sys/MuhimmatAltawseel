import React, { useState } from 'react';
import { 
  Bell, 
  Star, 
  TrendingUp, 
  Package, 
  Users, 
  ChevronLeft,
  LayoutDashboard,
  WalletCards,
  LayoutGrid,
  Settings,
  MoreHorizontal
} from 'lucide-react';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('لوحة التحكم');

  const navItems = [
    { name: 'لوحة التحكم', icon: LayoutDashboard },
    { name: 'الطلبات', icon: Package },
    { name: 'السائقون', icon: Users },
    { name: 'الرواتب', icon: WalletCards },
    { name: 'المنصات', icon: LayoutGrid },
    { name: 'الإعدادات', icon: Settings },
  ];

  return (
    <div dir="rtl" className="flex h-screen bg-white text-slate-800 font-sans overflow-hidden relative selection:bg-purple-100">
      
      {/* Soft Blurred Mesh Background Gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vh] bg-purple-200/40 blur-[100px] rounded-full mix-blend-multiply" />
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vh] bg-blue-100/50 blur-[120px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[20%] w-[60vw] h-[60vh] bg-indigo-100/40 blur-[100px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vh] bg-teal-50/50 blur-[80px] rounded-full mix-blend-multiply" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/70 backdrop-blur-2xl border-l border-white/50 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
            م
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">مهمة التوصيل</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-purple-50 text-purple-600 font-semibold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-purple-500' : 'text-slate-400'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">مرحباً 👋 أحمد</h2>
            <p className="text-sm text-slate-500 mt-1 font-light">إليك نظرة سريعة على أداء اليوم</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-white/60 backdrop-blur-md rounded-2xl text-sm font-medium text-slate-600 shadow-sm border border-white/60">
              ١٢ أكتوبر ٢٠٢٥
            </div>
            
            <button className="relative w-11 h-11 bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-white shadow-sm transition-colors">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 pb-10">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Orders */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-md shadow-slate-200/40 border border-white/60 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-300">
                  <Package size={24} />
                </div>
                <div className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-teal-50 text-teal-600">
                  <TrendingUp size={14} />
                  +12.5%
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-light text-sm mb-1">إجمالي الطلبات</p>
                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">2,847</h3>
              </div>
            </div>

            {/* Drivers */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-md shadow-slate-200/40 border border-white/60 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
                  <Users size={24} />
                </div>
                <div className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-teal-50 text-teal-600">
                  <TrendingUp size={14} />
                  +4.2%
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-light text-sm mb-1">سائق نشط</p>
                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">23</h3>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-md shadow-slate-200/40 border border-white/60 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform duration-300">
                  <WalletCards size={24} />
                </div>
                <div className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-teal-50 text-teal-600">
                  <TrendingUp size={14} />
                  +18.1%
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-light text-sm mb-1">إيرادات (ر.س)</p>
                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">127,400</h3>
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-md shadow-slate-200/40 border border-white/60 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform duration-300">
                  <Star size={24} />
                </div>
                <div className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-rose-50 text-rose-500">
                  <TrendingUp size={14} className="rotate-180" />
                  -0.8%
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-light text-sm mb-1">معدل التوصيل</p>
                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">96.2%</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (Recent Activity) */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-md shadow-slate-200/40 border border-white/60 h-full">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">أحدث عمليات التوصيل</h3>
                  <button className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-4 py-2 rounded-xl transition-colors">
                    عرض الكل
                    <ChevronLeft size={16} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { name: 'محمد خالد', platform: 'جاهز', time: 'قبل ٥ دقائق', amount: '45.00', avatar: 'م.خ', color: 'bg-orange-100 text-orange-600' },
                    { name: 'عبدالله سعيد', platform: 'هنقرستيشن', time: 'قبل ١٢ دقيقة', amount: '32.50', avatar: 'ع.س', color: 'bg-yellow-100 text-yellow-600' },
                    { name: 'فهد العتيبي', platform: 'مرسول', time: 'قبل ٢٨ دقيقة', amount: '65.00', avatar: 'ف.ع', color: 'bg-emerald-100 text-emerald-600' },
                    { name: 'سلمان الدوسري', platform: 'تويو', time: 'قبل ساعة', amount: '28.00', avatar: 'س.د', color: 'bg-cyan-100 text-cyan-600' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${activity.color}`}>
                          {activity.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{activity.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-light">{activity.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200/50 shadow-sm">
                          {activity.platform}
                        </span>
                        <div className="text-base font-bold text-slate-900 min-w-[80px] text-left">
                          {activity.amount} ر.س
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (Leaderboard & Chart) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Leaderboard */}
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-md shadow-slate-200/40 border border-white/60">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">أفضل السائقين</h3>
                  <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {[
                    { name: 'ياسر أحمد', orders: 142, rating: 4.9, progress: 95, avatar: 'ي.أ', bg: 'bg-purple-100 text-purple-600', bar: 'bg-purple-500' },
                    { name: 'خالد سعد', orders: 128, rating: 4.8, progress: 85, avatar: 'خ.س', bg: 'bg-blue-100 text-blue-600', bar: 'bg-blue-500' },
                    { name: 'نواف علي', orders: 115, rating: 4.7, progress: 75, avatar: 'ن.ع', bg: 'bg-teal-100 text-teal-600', bar: 'bg-teal-500' },
                  ].map((driver, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${driver.bg}`}>
                            {driver.avatar}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{driver.name}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs text-slate-500 font-medium">{driver.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-slate-900 block">{driver.orders}</span>
                          <span className="text-[10px] text-slate-400 font-light">طلب</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`${driver.bar} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${driver.progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Trend Mini-Chart */}
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-md shadow-slate-200/40 border border-white/60">
                 <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-6">نشاط الأسبوع</h3>
                 <div className="flex items-end justify-between h-24 gap-3">
                  {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                    <div key={i} className="w-full bg-slate-50 rounded-t-xl relative group overflow-hidden">
                      <div 
                        className={`absolute bottom-0 w-full rounded-t-xl transition-all duration-500 ${i === 6 ? 'bg-purple-500' : 'bg-purple-200 group-hover:bg-purple-300'}`} 
                        style={{ height: `${h}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
