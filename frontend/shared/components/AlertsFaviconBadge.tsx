import { useQuery } from '@tanstack/react-query';
import { alertsService } from '@services/alertsService';
import { useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { useFaviconBadge } from '@shared/hooks/useFaviconBadge';

/**
 * AlertsFaviconBadge — يحدّث أيقونة المتصفح وعنوان الصفحة بعدد التنبيهات النشطة.
 *
 * يتحدث كل دقيقة تلقائياً ويعيد الجلب عند التركيز على النافذة.
 */
export function AlertsFaviconBadge() {
  const { enabled } = useAuthQueryGate();

  const { data } = useQuery({
    queryKey: ['alerts', 'badge'],
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const alerts = await alertsService.getAll();
      return alerts.filter((a) => a.status === 'active' || a.status === 'pending').length;
    },
  });

  useFaviconBadge(data ?? 0);
  return null;
}
