import { useEffect, useRef } from 'react';

/**
 * useFaviconBadge — يضيف رقم على أيقونة المتصفح (Favicon badge).
 *
 * مثال:
 *   useFaviconBadge(alertCount);
 *   // تمرير 0 يزيل الرقم
 */
export function useFaviconBadge(count: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Find existing favicon link or create one
    let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    linkRef.current = link;

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
    img.src = link.href || '/favicon.ico';

    img.onload = () => {
      // Draw the original favicon
      ctx.clearRect(0, 0, 32, 32);
      ctx.drawImage(img, 0, 0, 32, 32);

      if (count > 0) {
        // Draw red circle badge
        const x = 22;
        const y = 4;
        const r = count > 9 ? 10 : 8;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ba1a1a';
        ctx.fill();

        // Draw count
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 99 ? '99+' : String(count), x, y + 1);
      }

      link!.href = canvas.toDataURL('image/png');
    };

    img.onerror = () => {
      // Favicon not loadable, skip badge
    };

    return () => {
      // Reset to original on unmount
      if (link) link.href = '/favicon.ico';
    };
  }, [count]);
}
