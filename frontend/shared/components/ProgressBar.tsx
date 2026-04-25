import { useEffect, useRef } from 'react';
import { useNavigation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// تخصيص شكل الشريط ليتناسب مع التصميم
NProgress.configure({ showSpinner: false, minimum: 0.15, easing: 'ease', speed: 400 });

/**
 * ProgressBar — شريط تحميل أعلى الصفحة يتفعّل تلقائياً عند التنقل بين الصفحات.
 * ضع المكون داخل <RouterProvider> مرة واحدة.
 */
export function ProgressBar() {
  const navigation = useNavigation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (navigation.state === 'loading') {
      NProgress.start();
    } else {
      // تأخير بسيط قبل الإخفاء لضمان ظهوره للحظة قصيرة
      timerRef.current = setTimeout(() => {
        NProgress.done();
        timerRef.current = null;
      }, 120);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigation.state]);

  return null;
}
