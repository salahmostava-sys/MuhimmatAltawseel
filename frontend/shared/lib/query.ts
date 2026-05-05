import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC } from '@shared/lib/toastMessages';
import { getErrorMessage } from '@services/serviceError';
// Re-export so existing consumers don't break
export { getErrorMessage } from '@services/serviceError';

/**
 * Default React Query `retry` — do not retry on auth failures; cap other retries (Sonar / TanStack v5).
 * Use in `QueryClient` `defaultOptions.queries.retry`.
 */
export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return failureCount < 2;
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403) return false;
  return failureCount < 2;
}

export type ToastQueryErrorOptions = {
  /** Shown as Sonner action button (manual refetch). */
  onRetry?: () => void;
};

export function toastQueryError(
  err: unknown,
  _title = 'تعذر تحميل البيانات',
  options?: ToastQueryErrorOptions,
): void {
  const onRetry = options?.onRetry;
  const description = getErrorMessage(err);
  toast.error(TOAST_ERROR_GENERIC, {
    description,
    ...(onRetry && {
      action: {
        label: 'إعادة المحاولة',
        onClick: () => {
          onRetry();
        },
      },
    }),
  });
}

export function toastMutationError(err: unknown, _title = 'تعذر تنفيذ العملية'): void {
  toast.error(TOAST_ERROR_GENERIC, { description: getErrorMessage(err) });
}

