import { useCallback, useEffect, useRef, useState } from 'react';
import { toast as sonnerToast } from '@shared/components/ui/sonner';
import { getErrorMessage } from '@services/serviceError';

/**
 * Options for configuring a safe action.
 */
export interface SafeActionOptions {
  /** Toast function from the consuming component. */
  toast: typeof sonnerToast;
  /** Title shown in the error toast when the action fails. */
  errorTitle?: string;
  /** If true, sets a shared loading state while the action runs. */
  trackLoading?: boolean;
}

/**
 * Return type from useSafeAction.
 */
export interface SafeActionResult {
  /** Whether any tracked action is currently running. */
  loading: boolean;
  /**
   * Wraps an async callback with:
   * - Automatic try/catch
   * - Consistent toast error notifications (using `getErrorMessage` from serviceError)
   * - Optional loading state management
   *
   * @param fn — The async function to execute safely.
   * @param overrides — Per-call overrides for errorTitle or trackLoading.
   * @returns A stable callback that never throws.
   */
  run: <T>(
    fn: () => Promise<T>,
    overrides?: Partial<Pick<SafeActionOptions, 'errorTitle' | 'trackLoading'>>,
  ) => Promise<T | undefined>;
}

/**
 * A utility hook that standardises async error handling across the app.
 *
 * Instead of writing `try/catch/finally` + `toast` in every handler, wrap the
 * action with `run()` and let the hook do the rest.
 *
 * @example
 * ```tsx
 * const { loading, run } = useSafeAction({
 *   toast,
 *   errorTitle: 'فشل الحفظ',
 * });
 *
 * const handleSave = () => run(async () => {
 *   await someService.save(data);
 *   toast({ title: 'تم الحفظ ✅' });
 * });
 * ```
 */
export function useSafeAction(options: SafeActionOptions): SafeActionResult {
  const { toast, errorTitle = 'حدث خطأ', trackLoading = true } = options;
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      overrides?: Partial<Pick<SafeActionOptions, 'errorTitle' | 'trackLoading'>>,
    ): Promise<T | undefined> => {
      const shouldTrack = overrides?.trackLoading ?? trackLoading;

      if (shouldTrack && mountedRef.current) setLoading(true);
      try {
        return await fn();
      } catch (err: unknown) {
        const title = overrides?.errorTitle ?? errorTitle;
        const description = getErrorMessage(err);
        toast.error(title, { description });
        return undefined;
      } finally {
        if (shouldTrack && mountedRef.current) setLoading(false);
      }
    },
    [toast, errorTitle, trackLoading],
  );

  return { loading, run };
}
