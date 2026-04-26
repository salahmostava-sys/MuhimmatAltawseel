import { CheckCircle2, CloudOff, Loader2, Save } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import type { AutoSaveStatus } from '@shared/hooks/useAutoSave';

interface FormAutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig = {
  idle: {
    icon: Save,
    label: 'الحفظ التلقائي مفعّل',
    color: 'text-muted-foreground',
  },
  saving: {
    icon: Loader2,
    label: 'جاري الحفظ...',
    color: 'text-primary',
  },
  saved: {
    icon: CheckCircle2,
    label: 'تم الحفظ',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: CloudOff,
    label: 'فشل الحفظ التلقائي',
    color: 'text-destructive',
  },
} as const;

/**
 * FormAutoSaveIndicator — يعرض حالة الحفظ التلقائي بجانب الفورم.
 *
 * مثال:
 *   const { status, lastSavedAt } = useAutoSave({ data: form, onSave: saveDraft });
 *   <FormAutoSaveIndicator status={status} lastSavedAt={lastSavedAt} />
 */
export function FormAutoSaveIndicator({
  status,
  lastSavedAt,
  className,
}: FormAutoSaveIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs transition-all duration-300',
        config.color,
        status === 'idle' && 'opacity-60',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        size={14}
        className={cn(
          'flex-shrink-0',
          status === 'saving' && 'animate-spin'
        )}
      />
      <span>{config.label}</span>
      {status === 'saved' && lastSavedAt && (
        <span className="text-muted-foreground">
          ({formatTime(lastSavedAt)})
        </span>
      )}
    </div>
  );
}
