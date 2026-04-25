import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineIndicator — شريط تحذيري يظهر أعلى الصفحة عند انقطاع الإنترنت.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-center text-xs font-semibold text-destructive-foreground shadow-lg">
      <WifiOff size={13} />
      أنت غير متصل بالإنترنت — سيتم استئناف المزامنة تلقائياً عند عودة الاتصال
    </div>
  );
}
