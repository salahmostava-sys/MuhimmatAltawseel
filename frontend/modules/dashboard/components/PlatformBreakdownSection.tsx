import { TrendingUp, TrendingDown, Users, Package, Target } from 'lucide-react';

type Rider = { name: string; orders: number; app: string; appColor: string; appId: string };

type OrdersByAppRow = {
  app: string;
  orders: number;
  appId: string;
  riders: number;
  brandColor: string;
  textColor: string;
  target: number;
  estRevenue: number;
};

type AppRidersGroup = {
  id: string;
  name: string;
  brand_color: string;
  riders: Rider[];
};

function PlatformCard(props: Readonly<{
  app: OrdersByAppRow;
  topRiders: Rider[];
  bottomRiders: Rider[];
  loading: boolean;
}>) {
  const { app, topRiders, bottomRiders, loading } = props;
  const pct = app.target > 0 ? Math.min(Math.round((app.orders / app.target) * 100), 999) : 0;
  const pctCapped = Math.min(pct, 100);
  const isOnTrack = pct >= 80;
  const isExceeding = pct >= 100;

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '2px solid', borderColor: app.brandColor + '40' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1.5 rounded-xl text-sm font-black"
            style={{ backgroundColor: app.brandColor, color: app.textColor }}
          >
            {app.app}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={12} />
            <span>{app.riders} مندوب</span>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
            isExceeding
              ? 'bg-emerald-100 text-emerald-700'
              : isOnTrack
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isExceeding ? <TrendingUp size={12} /> : isOnTrack ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {pct}%
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/40 px-0 py-0">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-1">
            <Package size={10} /> الطلبات
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {loading ? '—' : app.orders.toLocaleString('ar-SA')}
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-1">
            <Target size={10} /> الهدف
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {loading ? '—' : app.target.toLocaleString('ar-SA')}
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">التحقيق</p>
          <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden w-full mt-1">
            <div
              className={`absolute inset-y-0 start-0 rounded-full transition-all ${
                isExceeding ? 'bg-emerald-500' : isOnTrack ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${pctCapped}%` }}
            />
          </div>
          <p className={`text-sm font-black mt-1 ${
            isExceeding ? 'text-emerald-600' : isOnTrack ? 'text-blue-600' : 'text-amber-600'
          }`}>
            {pct}%
          </p>
        </div>
      </div>

      {/* Top & Bottom Riders */}
      {(topRiders.length > 0 || bottomRiders.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/30 border-t border-border/30">
          {topRiders.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                🏆 الأفضل
              </p>
              <div className="space-y-1.5">
                {topRiders.slice(0, 3).map((r, i) => (
                  <div key={`top-${r.name}-${i}`} className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate">{r.name}</span>
                    <span className="text-xs font-black tabular-nums">{r.orders.toLocaleString('ar-SA')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bottomRiders.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">
                📋 يحتاج متابعة
              </p>
              <div className="space-y-1.5">
                {bottomRiders.slice(0, 3).map((r, i) => (
                  <div key={`bot-${r.name}-${i}`} className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate">{r.name}</span>
                    <span className="text-xs font-black text-rose-600 tabular-nums">{r.orders.toLocaleString('ar-SA')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PlatformBreakdownSection(props: Readonly<{
  loading: boolean;
  ordersByApp: OrdersByAppRow[];
  topRidersPerApp: AppRidersGroup[];
  bottomRidersPerApp: AppRidersGroup[];
}>) {
  const { loading, ordersByApp, topRidersPerApp, bottomRidersPerApp } = props;

  if (!loading && ordersByApp.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-foreground">تصنيف المنصات</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            أداء كل منصة على حدة — الطلبات والهدف والمناديب
          </p>
        </div>
        {!loading && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl">
            {ordersByApp.length} منصة
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-64 bg-muted/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordersByApp.map((app) => {
            const topGroup = topRidersPerApp.find((g) => g.id === app.appId);
            const bottomGroup = bottomRidersPerApp.find((g) => g.id === app.appId);
            return (
              <PlatformCard
                key={app.appId || app.app}
                app={app}
                topRiders={topGroup?.riders ?? []}
                bottomRiders={bottomGroup?.riders ?? []}
                loading={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
