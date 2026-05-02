import { useEffect, useRef } from 'react';

/**
 * useFaviconBadge — يضيف رقم على أيقونة المتصفح (Favicon badge)
 * ويحدّث عنوان الصفحة بعدد التنبيهات.
 *
 * مثال:
 *   useFaviconBadge(alertCount);
 *   // تمرير 0 يزيل الرقم
 */
export function useFaviconBadge(count: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linkRef = useRef<HTMLLinkElement | null>(null);
  const originalTitleRef = useRef<string>('');
  const originalFaviconRef = useRef<string>('');

  useEffect(() => {
    // حفظ العنوان الأصلي مرة واحدة
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title.replace(/^\(\d+\+?\)\s*/, '');
    }

    // تحديث عنوان الصفحة
    const baseTitle = originalTitleRef.current;
    if (count > 0) {
      const badge = count > 99 ? '99+' : String(count);
      document.title = `(${badge}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [count]);

  useEffect(() => {
    // Find existing favicon link or create one
    let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    linkRef.current = link;

    // حفظ الأيقونة الأصلية
    if (!originalFaviconRef.current) {
      originalFaviconRef.current = link.href || '/favicon.ico';
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalFaviconRef.current;

    img.onload = () => {
      // Draw the original favicon
      ctx.clearRect(0, 0, 32, 32);
      ctx.drawImage(img, 0, 0, 32, 32);

      if (count > 0) {
        const badgeText = count > 99 ? '99+' : String(count);
        const isWide = badgeText.length > 2;

        // Draw red circle badge
        const x = 22;
        const y = 4;
        const r = isWide ? 10 : 8;

        // خلفية بيضاء للتباين
        ctx.beginPath();
        ctx.arc(x, y, r + 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // الدائرة الحمراء
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // Draw count
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${isWide ? 8 : 11}px "Segoe UI", Tahoma, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, x, y + 1);
      }

      link?.href = canvas.toDataURL('image/png');
    };

    img.onerror = () => {
      // إذا فشل تحميل الأيقونة، أنشئ أيقونة بسيطة مع badge
      if (count > 0) {
        ctx.clearRect(0, 0, 32, 32);
        ctx.fillStyle = '#2642e6';
        ctx.fillRect(0, 0, 32, 32);

        const badgeText = count > 99 ? '99+' : String(count);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(26, 6, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, 26, 6);

        if (link) {
          link.href = canvas.toDataURL('image/png');
        }
      }
    };

    return () => {
      // Reset to original on unmount
      if (link) link.href = originalFaviconRef.current || '/favicon.ico';
      document.title = originalTitleRef.current;
    };
  }, [count]);
}
