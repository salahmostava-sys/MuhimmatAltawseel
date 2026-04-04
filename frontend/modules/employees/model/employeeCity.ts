const CITY_ALIAS_MAP: Record<string, string> = {
  makkah: 'makkah',
  mecca: 'makkah',
  'مكة': 'makkah',
  'مكه': 'makkah',
  'مكة المكرمة': 'makkah',
  'مكه المكرمة': 'makkah',
  jeddah: 'jeddah',
  jedda: 'jeddah',
  'جدة': 'jeddah',
  'جده': 'jeddah',
};

export const DEFAULT_EMPLOYEE_CITY_OPTIONS = ['makkah', 'jeddah'] as const;

export function normalizeEmployeeCityValue(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return CITY_ALIAS_MAP[trimmed.toLowerCase()] ?? trimmed;
}

export function splitEmployeeCitiesInput(value: string | null | undefined): string[] {
  return String(value ?? '')
    .split(/[,\n|،;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeEmployeeCities(
  values: Array<string | null | undefined>,
  fallback?: string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushValue = (raw: string | null | undefined) => {
    const normalized = normalizeEmployeeCityValue(raw);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };

  values.forEach((value) => {
    splitEmployeeCitiesInput(value).forEach(pushValue);
  });
  pushValue(fallback);

  return out;
}

export function cityLabel(value: string | null | undefined, fallback = '•'): string {
  const normalized = normalizeEmployeeCityValue(value);
  if (!normalized) return fallback;
  if (normalized === 'makkah') return 'مكة';
  if (normalized === 'jeddah') return 'جدة';
  return normalized;
}

