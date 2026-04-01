import type { FilterState } from '@shared/hooks/useAdvancedFilter';

export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: FilterState,
  fieldMap: Record<string, keyof T>,
): T[] {
  return data.filter((item) => {
    return Object.entries(filters).every(([key, values]) => {
      if (!values || values.length === 0) return true;
      const field = fieldMap[key];
      if (!field) return true;
      const itemVal = String(item[field] ?? '');

      if (key.endsWith('_range') || key === 'date_range') {
        const [from, to] = values;
        if (from && itemVal < from) return false;
        if (to && itemVal > to) return false;
        return true;
      }

      return values.includes(itemVal);
    });
  });
}
