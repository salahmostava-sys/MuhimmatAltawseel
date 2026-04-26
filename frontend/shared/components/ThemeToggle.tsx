import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@app/providers/ThemeContext';
import { cn } from '@shared/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — زر تبديل الثيم بتأثير دوران ناعم.
 *
 * يستبدل زر الثيم العادي في الهيدر ليعطي تجربة مرئية أفضل.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={cn(
        'relative h-9 w-9 flex items-center justify-center rounded-full',
        'border border-border/60 bg-card/80 text-muted-foreground',
        'hover:bg-muted transition-colors flex-shrink-0 overflow-hidden',
        className
      )}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label={isDark ? 'تبديل للوضع الفاتح' : 'تبديل للوضع الداكن'}
    >
      {/* Sun icon — visible in dark mode */}
      <Sun
        size={16}
        className={cn(
          'absolute text-warning transition-all duration-500 ease-out',
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        )}
      />
      {/* Moon icon — visible in light mode */}
      <Moon
        size={16}
        className={cn(
          'absolute transition-all duration-500 ease-out',
          isDark
            ? '-rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
    </button>
  );
}
