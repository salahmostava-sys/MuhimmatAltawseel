import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  WalletCards, 
  LayoutGrid, 
  BarChart3, 
  Settings, 
  Bell, 
  Search, 
  ChevronDown, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal,
  Star
} from 'lucide-react';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('لوحة التحكم');

  const navItems = [
    { name: 'لوحة التحكم', icon: LayoutDashboard },
    { name: 'الطلبات', icon: Package },
    { name: 'السائقون', icon: Users },
    { name: 'الرواتب', icon: WalletCards },
    { name: 'المنصات', icon: LayoutGrid },
    { name: 'التقارير', icon: BarChart3 },
    { name: 'الإعدادات', icon: Settings },
  ];

  const stats = [
    { label: 'إجمالي الطلبات', value: '٢٤٧', trend: '+١٢٪', positive: true },
    { label: 'السائقون النشطون', value: '١٨', trend: '+٢', positive: true },
    { label: 'إجمالي الإيرادات', value: '٨٤,٢٠٠ ر.س', trend: '+٨.٥٪', positive: true },
    { label: 'معدل التوصيل', value: '٩٤٪', trend: '-١٪', positive: false },
  ];

  const chartData = [
    { day: 'السبت', value: 40 },
    { day: 'الأحد', value: 65 },
    { day: 'الإثنين', value: 55 },
    { day: 'الثلاثاء', value: 80 },
    { day: 'الأربعاء', value: 95 },
    { day: 'الخميس', value: 85 },
    { day: 'الجمعة', value: 100 },
  ];

  const recentActivity = [
    { id: 1, driver: 'محمود سالم', order: '#١٠٤٢', platform: 'هنقرستيشن', time: 'منذ ١٠ دقائق', amount: '٤٥ ر.س' },
    { id: 2, driver: 'خالد عبدالله', order: '#١٠٤١', platform: 'طلبات', time: 'منذ ٢٥ دقيقة', amount: '٣٢ ر.س' },
    { id: 3, driver: 'ياسر محمد', order: '#١٠٤٠', platform: 'جاهز', time: 'منذ ٤٥ دقيقة', amount: '٥٥ ر.س' },
    { id: 4, driver: 'عمر حسن', order: '#١٠٣٩', platform: 'هنقرستيشن', time: 'منذ ساعة', amount: '٢٨ ر.س' },
    { id: 5, driver: 'سعد علي', order: '#١٠٣٨', platform: 'تويو', time: 'منذ ساعة ونصف', amount: '٦٠ ر.س' },
  ];

  const topDrivers = [
    { name: 'محمود سالم', orders: 142, rating: 4.9, avatar: 'م' },
    { name: 'ياسر محمد', orders: 128, rating: 4.8, avatar: 'ي' },
    { name: 'خالد عبدالله', orders: 115, rating: 4.7, avatar: 'خ' },
  ];

  return (
    <div dir="rtl" className="flex h-screen bg-[#fafaf7] text-[#1c1917] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#f4f1ea] border-l border-[#e7e1d5] flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#f59e0b]/20">
            م
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#1c1917]">مهمة التوصيل</h1>
            <p className="text-xs text-[#78716c]">نظام إدارة الأسطول</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-[#d97706] shadow-sm shadow-[#d97706]/5 font-semibold' 
                    : 'text-[#57534e] hover:bg-[#eae6db] hover:text-[#1c1917]'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[#f59e0b]' : ''} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e7e1d5]">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-[#f0ede6]">
            <div className="w-10 h-10 rounded-full bg-[#fde68a] text-[#d97706] flex items-center justify-center font-bold">
              أ
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1c1917]">أحمد مدير الأسطول</p>
              <p className="text-xs text-[#78716c]">مدير النظام</p>
            </div>
            <ChevronDown size={16} className="text-[#a8a29e]" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f59e0b]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-[#e7e1d5]/50 bg-[#fafaf7]/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#1c1917]">مرحباً، أحمد 👋</h2>
            <p className="text-sm text-[#78716c] mt-1">١٢ أكتوبر ٢٠٢٣ • نظرة عامة على أداء اليوم</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" size={18} />
              <input 
                type="text" 
                placeholder="البحث عن سائق أو طلب..." 
                className="w-64 bg-white border border-[#e7e1d5] rounded-full py-2 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50 focus:border-[#f59e0b] transition-all"
              />
            </div>
            
            <button className="relative w-10 h-10 bg-white border border-[#e7e1d5] rounded-full flex items-center justify-center text-[#57534e] hover:bg-[#f4f1ea] transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ef4444] rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7e1d5] flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[#78716c] font-medium">{stat.label}</p>
                  <div className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
                    stat.positive ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
                  }`}>
                    {stat.trend}
                    {stat.positive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#1c1917]">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column (Chart & Ranking) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Chart Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7e1d5]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-[#1c1917]">أداء الطلبات الأسبوعي</h3>
                  <button className="text-sm text-[#d97706] font-medium hover:underline">عرض التقرير المفصل</button>
                </div>
                
                <div className="h-64 flex items-end gap-2 sm:gap-4 justify-between pt-6 relative">
                  {/* Chart Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="w-full h-[1px] bg-[#f0ede6]"></div>
                    ))}
                  </div>
                  
                  {/* Bars */}
                  {chartData.map((data, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 z-10 group">
                      <div className="w-full max-w-[40px] bg-[#fef3c7] rounded-t-lg relative group-hover:bg-[#fde68a] transition-colors" style={{ height: `${data.value}%` }}>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#f59e0b] to-[#fbbf24] rounded-t-lg transition-all duration-500 shadow-[0_-4px_10px_rgba(245,158,11,0.2)]" style={{ height: `${data.value * 0.7}%` }}></div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1c1917] text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {data.value} طلب
                        </div>
                      </div>
                      <span className="text-xs text-[#78716c] mt-3 font-medium">{data.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drivers Ranking */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7e1d5]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-[#1c1917]">أفضل السائقين هذا الأسبوع</h3>
                  <button className="p-2 text-[#a8a29e] hover:bg-[#f4f1ea] rounded-lg transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topDrivers.map((driver, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[#f0ede6] bg-[#fafaf7] hover:border-[#f59e0b]/30 transition-colors">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${
                        i === 0 ? 'bg-gradient-to-br from-[#fcd34d] to-[#f59e0b] text-white' : 
                        i === 1 ? 'bg-gradient-to-br from-[#e5e7eb] to-[#a3a3a3] text-white' : 
                        'bg-gradient-to-br from-[#fed7aa] to-[#d97706] text-white'
                      }`}>
                        {driver.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1c1917] text-sm">{driver.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#78716c]">{driver.orders} طلب</span>
                          <span className="flex items-center text-xs font-semibold text-[#d97706]">
                            <Star size={10} className="fill-current mr-1" />
                            {driver.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column (Activity Feed) */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7e1d5] h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-[#1c1917]">أحدث العمليات</h3>
                  <button className="text-sm text-[#d97706] font-medium hover:underline">الكل</button>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#e7e1d5] before:to-transparent">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="relative flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="z-10 flex items-center justify-center w-10 h-10 rounded-full bg-[#fef3c7] text-[#d97706] ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1c1917] flex items-center gap-2">
                            {activity.driver} 
                            <span className="px-2 py-0.5 bg-[#f4f1ea] text-[#78716c] rounded text-[10px] font-normal border border-[#e7e1d5]">
                              {activity.platform}
                            </span>
                          </p>
                          <p className="text-xs text-[#78716c] mt-1 flex items-center gap-1">
                            <Clock size={12} /> {activity.time} • طلب {activity.order}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-[#1c1917] bg-[#fafaf7] px-3 py-1 rounded-lg border border-[#e7e1d5]">
                        {activity.amount}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-8 py-3 rounded-xl border border-[#e7e1d5] text-[#57534e] font-medium text-sm hover:bg-[#f4f1ea] hover:text-[#1c1917] transition-colors flex items-center justify-center gap-2">
                  عرض المزيد من النشاطات
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;