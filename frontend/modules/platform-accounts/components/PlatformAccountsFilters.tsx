import { Search, X } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import type { PlatformAppOption } from '@modules/platform-accounts/types';

interface PlatformAccountsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  apps: PlatformAppOption[];
  hasActiveFilters: boolean;
  onClear: () => void;
}

export const PlatformAccountsFilters = ({
  search,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
  filterStatus,
  onFilterStatusChange,
  apps,
  hasActiveFilters,
  onClear,
}: PlatformAccountsFiltersProps) => {
  return (
    <div className="ds-card p-3 flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="بحث باسم الحساب، رقم الإقامة، أو المندوب..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pr-9 h-9 text-sm"
        />
      </div>
      <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue placeholder="المنصة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل المنصات</SelectItem>
          {apps.map((app) => (
            <SelectItem key={app.id} value={app.id}>
              {app.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="h-9 w-36 text-sm">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل الحالات</SelectItem>
          <SelectItem value="active">نشط</SelectItem>
          <SelectItem value="inactive">غير نشط</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-9 text-muted-foreground"
          onClick={onClear}
        >
          <X size={13} />
          مسح
        </Button>
      )}
    </div>
  );
};
