import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '@modules/salaries/types/salary.types';

type SalarySortIconProps = Readonly<{
  field: string;
  sortField: string | null;
  sortDir: SortDir;
}>;

export function SalarySortIcon({ field, sortField, sortDir }: SalarySortIconProps) {
  if (sortField !== field) return <ChevronsUpDown size={10} className="inline me-0.5 opacity-40" />;
  if (sortDir === 'asc') return <ChevronUp size={10} className="inline me-0.5" />;
  return <ChevronDown size={10} className="inline me-0.5" />;
}
