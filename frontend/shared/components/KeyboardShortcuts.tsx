import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Banknote,
  Wrench,
  Settings,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';

type Shortcut = {
  keys: string[];
  label: string;
  action: string;
  icon?: React.ReactNode;
  handler: () => void;
};

/**
 * KeyboardShortcuts — نافذة اختصارات لوحة المفاتيح تفتح بـ Shift+?
 * تظهر قائمة بكل الاختصارات المتاحة للمستخدمين المتقدمين.
 */
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      keys: ['Shift', '?'],
      label: 'فتح الاختصارات',
      action: 'نافذة المساعدة',
      icon: <Search size={14} />,
      handler: () => setOpen(true),
    },
    {
      keys: ['Ctrl', 'K'],
      label: 'بحث سريع',
      action: 'فتح شريط البحث',
      icon: <Search size={14} />,
      handler: () => {
        setOpen(false);
        // Trigger focus on the global search input
        const el = document.querySelector<HTMLInputElement>('[placeholder*="Ctrl+K"]');
        el?.focus();
      },
    },
    {
      keys: ['Ctrl', 'D'],
      label: 'الرئيسية',
      action: 'لوحة التحكم',
      icon: <LayoutDashboard size={14} />,
      handler: () => { setOpen(false); navigate('/'); },
    },
    {
      keys: ['Ctrl', 'E'],
      label: 'الموظفون',
      action: 'قائمة الموظفين',
      icon: <Users size={14} />,
      handler: () => { setOpen(false); navigate('/employees'); },
    },
    {
      keys: ['Ctrl', 'O'],
      label: 'الطلبات',
      action: 'إدارة الطلبات',
      icon: <ClipboardList size={14} />,
      handler: () => { setOpen(false); navigate('/orders'); },
    },
    {
      keys: ['Ctrl', 'S'],
      label: 'الرواتب',
      action: 'كشف الرواتب',
      icon: <Banknote size={14} />,
      handler: () => { setOpen(false); navigate('/salaries'); },
    },
    {
      keys: ['Ctrl', 'M'],
      label: 'الصيانة',
      action: 'الصيانة والمخزون',
      icon: <Wrench size={14} />,
      handler: () => { setOpen(false); navigate('/maintenance'); },
    },
    {
      keys: ['Ctrl', ','],
      label: 'الإعدادات',
      action: 'إعدادات النظام',
      icon: <Settings size={14} />,
      handler: () => { setOpen(false); navigate('/settings'); },
    },
    {
      keys: ['Esc'],
      label: 'رجوع / إغلاق',
      action: 'إلغاء العملية الحالية',
      handler: () => setOpen(false),
    },
  ];

  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    // Shift+? opens the modal
    if (e.shiftKey && e.key === '?') {
      e.preventDefault();
      setOpen(prev => !prev);
      return;
    }

    // If modal is closed, still check navigation shortcuts
    if (open) {
      // Escape closes
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      return; // Don't trigger navigation while modal is open
    }

    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    // Navigation shortcuts (only when modal closed)
    const map: Record<string, string> = {
      d: '/',
      e: '/employees',
      o: '/orders',
      s: '/salaries',
      m: '/maintenance',
      ',': '/settings',
    };

    const key = e.key.toLowerCase();
    if (map[key]) {
      e.preventDefault();
      navigate(map[key]);
    }
  }, [open, navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            ⌨️ اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 max-h-[50vh] overflow-y-auto">
          {/* Navigation section */}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            التنقل
          </h4>
          <div className="mb-4 space-y-1">
            {shortcuts.slice(2, 8).map((s) => (
              <div
                key={s.keys.join('+')}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-foreground">
                  <span className="text-muted-foreground">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">— {s.action}</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
                  {s.keys.map((k, i) => (
                    <span key={k}>
                      {i > 0 && <span className="mx-0.5 opacity-40">+</span>}
                      {k}
                    </span>
                  ))}
                </kbd>
              </div>
            ))}
          </div>

          {/* Utility section */}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            أدوات
          </h4>
          <div className="space-y-1">
            {shortcuts.filter(s => s.keys.includes('K') || s.keys.includes('?') || s.keys.includes('Esc')).map((s) => (
              <div
                key={s.keys.join('+')}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-foreground">
                  <span className="text-muted-foreground">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">— {s.action}</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
                  {s.keys.map((k, i) => (
                    <span key={k}>
                      {i > 0 && <span className="mx-0.5 opacity-40">+</span>}
                      {k}
                    </span>
                  ))}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground/60">
          اضغط Shift + ? في أي وقت لعرض هذه النافذة
        </p>
      </DialogContent>
    </Dialog>
  );
}
