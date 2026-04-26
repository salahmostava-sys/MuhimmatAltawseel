import { useEffect, useRef } from 'react';

type FaviconBadgeProps = {
  count: number;
  enabled?: boolean;
};

/**
 * FaviconBadge - يعرض رقم بجانب الأيقونة بعدد التنبيهات الجديدة
 * ويحدّث عنوان الصفحة بعدد التنبيهات.
 *
 * مثال:
 *   <FaviconBadge count={5} />
 */
export function FaviconBadge({ count, enabled = true }: FaviconBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalFaviconRef = useRef<string>('');
  const originalTitleRef = useRef<string>('');

  useEffect(() => {
    // حفظ العنوان الأصلي مرة واحدة
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title.replace(/^\(\d+\+?\)\s*/, '');
    }

    if (!enabled || count <= 0) {
      document.title = originalTitleRef.current;
    } else {
      const badge = count > 99 ? '99+' : String(count);
      document.title = `(${badge}) ${originalTitleRef.current}`;
    }
  }, [count, enabled]);

  useEffect(() => {
    if (!enabled) {
      resetFavicon();
      return;
    }

    // حفظ الأيقونة الأصلية
    if (!originalFaviconRef.current) {
      const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink) {
        originalFaviconRef.current = faviconLink.href;
      } else {
        // إذا لم توجد أيقونة، استخدم أيقونة افتراضية
        originalFaviconRef.current = '/favicon.ico';
      }
    }

    if (count > 0) {
      drawFaviconWithBadge(count);
    } else {
      resetFavicon();
    }

    return () => {
      resetFavicon();
      document.title = originalTitleRef.current;
    };
  }, [count, enabled]);

  const drawFaviconWithBadge = (badgeCount: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // تحميل الأيقونة الأصلية
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // رسم الأيقونة الأصلية
      ctx.drawImage(img, 0, 0, 32, 32);

      // رسم الـ badge
      const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);
      const badgeSize = badgeText.length > 2 ? 14 : 12;

      // خلفية بيضاء للتباين
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(32 - badgeSize / 2 - 2, badgeSize / 2 + 2, badgeSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();

      // دائرة الخلفية الحمراء
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(32 - badgeSize / 2 - 2, badgeSize / 2 + 2, badgeSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // النص
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${badgeText.length > 2 ? 8 : 9}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 32 - badgeSize / 2 - 2, badgeSize / 2 + 2);

      // تحديث الـ favicon
      updateFavicon(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      // إذا فشل تحميل الأيقونة، أنشئ أيقونة بسيطة مع badge
      ctx.fillStyle = '#2642e6';
      ctx.fillRect(0, 0, 32, 32);

      const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(26, 6, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 26, 6);

      updateFavicon(canvas.toDataURL('image/png'));
    };

    img.src = originalFaviconRef.current;
  };

  const updateFavicon = (dataUrl: string) => {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = dataUrl;
  };

  const resetFavicon = () => {
    if (originalFaviconRef.current) {
      updateFavicon(originalFaviconRef.current);
    }
  };

  return null; // هذا المكون لا يعرض شيء في DOM
}
