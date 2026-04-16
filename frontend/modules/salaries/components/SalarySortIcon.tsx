import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '@modules/salaries/types/salary.types';

type SalarySortIconProps = Readonly<{
  field: string;
  sortField: string | null;
  sortDir: SortDir;
}>;

/**
 * FIX P2: three-state sort indicator.
 * - Not active field        → faint double-chevron (hint that column is sortable)
 * - Active + asc            → solid up-chevron
 * - Active + desc           → solid down-chevron
 * - Active + null (cleared) → should not appear (handleSort resets sortField too)
 *
 * The column header `title` attribute now communicates the next action to the user.
 * Usage: wrap the <th> onClick with title={nextSortLabel} — handled in SalaryTable.
 */
export function SalarySortIcon({ field, sortField, sortDir }: SalarySortIconProps) {
  if (sortField !== field) return <ChevronsUpDown size={10} className="inline me-0.5 opacity-40" />;
  if (sortDir === 'asc') return <ChevronUp size={10} className="inline me-0.5 text-primary" />;
  if (sortDir === 'desc') return <ChevronDown size={10} className="inline me-0.5 text-primary" />;
  // null state (sort cleared) — show faint icon to indicate it's still clickable
  return <ChevronsUpDown size={10} className="inline me-0.5 opacity-60 text-primary" />;
}
