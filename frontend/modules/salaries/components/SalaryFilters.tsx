import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Search } from 'lucide-react';
import { GlobalTableFilters, createDefaultGlobalFilters, type GlobalTableFilterState, type BranchKey } from '@shared/components/table/GlobalTableFilters';
import type { FastApprovedFilter } from '@modules/salaries/model/salaryUtils';

export function SalaryFilters(props: Readonly<{
  branch: BranchKey;
  search: string;
  approved: FastApprovedFilter;
  onApprovedChange: (v: FastApprovedFilter) => void;
  onFiltersChange: (next: GlobalTableFilterState) => void;
}>) {
  const { branch, search, approved, onApprovedChange, onFiltersChange } = props;
  return (
    <div className="ds-card p-3 space-y-3">
      <GlobalTableFilters
        value={{
          ...createDefaultGlobalFilters(),
          branch,
          search,
          driverId: 'all',
          platformAppIds: [],
          dateFrom: '',
          dateTo: '',
        }}
        onChange={(next) => onFiltersChange({ ...next, driverId: 'all', platformAppIds: [], dateFrom: '', dateTo: '' })}
        onReset={() => onFiltersChange(createDefaultGlobalFilters())}
        options={{
          enableBranch: true,
          enableDriver: false,
          enablePlatform: false,
          enableDateRange: false,
        }}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">الاعتماد</span>
        <Select value={approved} onValueChange={(v) => onApprovedChange(v as FastApprovedFilter)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="الكل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="approved">معتمد</SelectItem>
            <SelectItem value="pending">غير معتمد</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function SalaryDetailedFilters(props: Readonly<{
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
}>) {
  const { search, setSearch, statusFilter, setStatusFilter } = props;
  return (
    <>
      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم..." className="pr-9 h-9 w-48" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="flex gap-1">
        {[{ v: 'all', l: 'الكل' }, { v: 'approved', l: 'معتمد' }, { v: 'paid', l: 'مصروف' }].map(s => (
          <button key={s.v} onClick={() => setStatusFilter(s.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {s.l}
          </button>
        ))}
      </div>
    </>
  );
}
