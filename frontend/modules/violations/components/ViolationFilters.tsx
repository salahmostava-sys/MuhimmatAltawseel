import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
type ViolationFiltersProps = Readonly<{
  savedSearch: string;
  setSavedSearch: (v: string) => void;
  savedStatusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setSavedStatusFilter: (v: 'all' | 'pending' | 'approved' | 'rejected') => void;
}>;

export default function ViolationFilters({
  savedSearch,
  setSavedSearch,
  savedStatusFilter,
  setSavedStatusFilter,
}: ViolationFiltersProps) {
  return (
    <div className="px-5 py-3 border-b border-border/40 bg-muted/20">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={savedSearch}
          onChange={(e) => setSavedSearch(e.target.value)}
          placeholder="بحث باسم الموظف أو تفاصيل المخالفة..."
          className="h-9 flex-1 min-w-[200px]"
        />
        <Select value={savedStatusFilter} onValueChange={(v) => setSavedStatusFilter(v as 'all' | 'pending' | 'approved' | 'rejected')}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">قيد المراجعة</SelectItem>
            <SelectItem value="approved">موافَق</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
