import { Search, FolderOpen } from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import type { AppRow } from '@modules/fuel/types/fuel.types';

export function FuelFiltersToolbar(props: Readonly<{
  search: string;
  setSearch: (v: string) => void;
  view: 'monthly' | 'daily';
  handleExportMonthly: () => void;
  handleExportDaily: () => void;
  onOpenImport: () => void;
}>) {
  const { search, setSearch, view, handleExportMonthly, handleExportDaily, onOpenImport } = props;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative w-[200px] min-w-[170px] max-w-[260px]">
        <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="بحث باسم المندوب..."
          className="h-8 ps-8 pe-[4.25rem] text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute end-1 top-1/2 -translate-y-1/2 h-7 px-2 text-[10px] text-muted-foreground"
            onClick={() => setSearch('')}
          >
            تصفير
          </Button>
        ) : null}
      </div>
      {view === 'monthly' ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <FolderOpen size={14} /> ملفات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportMonthly}>📊 تصدير Excel (ملخص شهري)</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const headers = [['اسم المندوب', 'الكيلومترات', 'تكلفة البنزين (ر.س)', 'ملاحظات']];
                const ws = XLSX.utils.aoa_to_sheet(headers);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'قالب');
                XLSX.writeFile(wb, 'template_fuel.xlsx');
              }}
            >
              📋 تحميل قالب الاستيراد
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenImport}>⬆️ استيراد GPS شهري</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {view === 'daily' ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <FolderOpen size={14} /> ملفات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportDaily}>📊 تصدير Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function FuelPlatformTabs(props: Readonly<{
  platformTab: string;
  setPlatformTab: (v: string) => void;
  apps: AppRow[];
}>) {
  const { platformTab, setPlatformTab, apps } = props;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-muted-foreground font-medium">المنصة:</span>
      <button
        type="button"
        onClick={() => setPlatformTab('all')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${platformTab === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
      >
        الكل
      </button>
      {apps.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => setPlatformTab(a.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${platformTab === a.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
