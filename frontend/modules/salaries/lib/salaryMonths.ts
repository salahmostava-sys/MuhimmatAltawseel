import { format } from 'date-fns';

export type SalaryMonth = { v: string; l: string };

export function generateMonths(): SalaryMonth[] {
  const result: SalaryMonth[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = format(d, 'yyyy-MM');
    const l = d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    result.push({ v, l });
  }
  return result;
}

// FIX: previously `months` was a static module-level array generated once at import time.
// If the app stayed open across a month boundary (e.g. March 31 → April 1), the new
// month would never appear in the salary month selector until a full page reload.
//
// Now we memoize per calendar month: regenerate only when the actual month changes.
// The Proxy maintains backward compatibility — existing `months.find(...)`, `months.map(...)`,
// and `months[0]` usage in 10+ files works without any import changes.

let cachedMonths: SalaryMonth[] | null = null;
let cachedAtMonth = '';

/** Returns the current months list, regenerating only when the calendar month changes. */
export function getMonths(): SalaryMonth[] {
  const now = format(new Date(), 'yyyy-MM');
  if (cachedAtMonth === now && cachedMonths) return cachedMonths;
  cachedMonths = generateMonths();
  cachedAtMonth = now;
  return cachedMonths;
}

/**
 * Backward-compatible `months` export.
 * All existing code (`months.find(...)`, `months.map(...)`, `months[0]`, etc.)
 * works unchanged — the Proxy delegates every property access to `getMonths()`.
 */
export const months: SalaryMonth[] = new Proxy([] as SalaryMonth[], {
  get(_target, prop, receiver) {
    const real = getMonths();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(getMonths(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getMonths());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getMonths(), prop);
  },
});
