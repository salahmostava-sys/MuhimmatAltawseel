import { useCallback, useEffect, useRef, useState } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AutoSaveOptions<T> = {
  /** The data to save */
  data: T;
  /** Function that persists the data */
  onSave: (data: T) => void | Promise<void>;
  /** Delay in ms between saves (default: 10000 = 10s) */
  interval?: number;
  /** Only save if data has changed */
  enabled?: boolean;
  /** How long to show the "saved" status before returning to idle (ms) */
  savedDuration?: number;
};

/**
 * useAutoSave — يحفظ البيانات تلقائياً كل فترة محددة ويعرض حالة الحفظ.
 *
 * مثال:
 *   const { status, lastSavedAt } = useAutoSave({ data: form, onSave: saveDraft, interval: 10_000 });
 */
export function useAutoSave<T>({
  data,
  onSave,
  interval = 10_000,
  enabled = true,
  savedDuration = 3_000,
}: AutoSaveOptions<T>) {
  const previousRef = useRef<T>(data);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => Promise<void>>();

  const save = useCallback(async () => {
    const prev = previousRef.current;
    // Simple shallow check — skip if identical by reference
    if (prev === data) return;
    previousRef.current = data;

    setStatus('saving');
    try {
      await onSaveRef.current(data);
      setStatus('saved');
      setLastSavedAt(new Date());

      // Clear any existing timer before setting a new one
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle');
      }, savedDuration);
    } catch {
      setStatus('error');
    }
  }, [data, savedDuration]);

  // Keep a stable ref so the unmount effect always calls the latest save
  saveRef.current = save;

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

  // Also save on unmount — use ref so we always call the latest closure
  useEffect(() => {
    return () => {
      void saveRef.current?.();
    };
  }, []);

  // Clean up saved timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { save, status, lastSavedAt };
}
