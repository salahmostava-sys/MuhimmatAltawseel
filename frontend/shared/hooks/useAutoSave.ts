import { useCallback, useEffect, useRef } from 'react';

type AutoSaveOptions<T> = {
  /** The data to save */
  data: T;
  /** Function that persists the data */
  onSave: (data: T) => void | Promise<void>;
  /** Delay in ms between saves (default: 10000 = 10s) */
  interval?: number;
  /** Only save if data has changed */
  enabled?: boolean;
};

/**
 * useAutoSave — يحفظ البيانات تلقائياً كل فترة محددة.
 *
 * مثال:
 *   useAutoSave({ data: form, onSave: saveDraft, interval: 10_000 });
 */
export function useAutoSave<T>({ data, onSave, interval = 10_000, enabled = true }: AutoSaveOptions<T>) {
  const previousRef = useRef<T>(data);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const save = useCallback(() => {
    const prev = previousRef.current;
    // Simple shallow check — skip if identical by reference
    if (prev === data) return;
    previousRef.current = data;
    void onSaveRef.current(data);
  }, [data]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(save, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, save]);

  // Also save on unmount
  useEffect(() => {
    return () => {
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { save };
}
