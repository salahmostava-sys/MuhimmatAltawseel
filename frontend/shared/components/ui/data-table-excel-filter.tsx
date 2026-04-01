import React, { useMemo, useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { Check, Filter, Search, ArrowDownAZ, ArrowUpZA, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@shared/components/ui/command';
import { Checkbox } from '@shared/components/ui/checkbox';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Button } from '@shared/components/ui/button';
import { Separator } from '@shared/components/ui/separator';

export const BLANK_FILTER_VALUE = '(Blanks)';

interface DataTableExcelFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableExcelFilter<TData, TValue>({ column, title }: DataTableExcelFilterProps<TData, TValue>) {
  const [open, setOpen] = useState(false);

  // Derive unique values faceted from the column
  const facetedValues = useMemo(() => column.getFacetedUniqueValues(), [column]);

  const uniqueValues = useMemo(() => {
    const map = new Map<string, number>();
    
    // Safely extract string/number representations
    for (const [key, value] of facetedValues.entries()) {
      // Treat null/undefined/empty as Blanks
      if (key === null || key === undefined || key === '') {
        map.set(BLANK_FILTER_VALUE, (map.get(BLANK_FILTER_VALUE) || 0) + value);
      } else {
        const strKey = String(key);
        map.set(strKey, (map.get(strKey) || 0) + value);
      }
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === BLANK_FILTER_VALUE) return 1;
      if (b[0] === BLANK_FILTER_VALUE) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [facetedValues]);

  // Read current filter state
  const currentFilterValue = useMemo(() => (column.getFilterValue() as string[]) || [], [column]);

  // Local state for checkboxes inside the Popover
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(currentFilterValue));

  // Sync state when popover opens
  useEffect(() => {
    if (open) {
      setSelectedValues(new Set(currentFilterValue));
    }
  }, [open, currentFilterValue]);

  const allSelected = selectedValues.size === uniqueValues.length && uniqueValues.length > 0;
  const isFiltered = currentFilterValue.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedValues(new Set());
    } else {
      setSelectedValues(new Set(uniqueValues.map(([val]) => val)));
    }
  };

  const toggleValue = (value: string) => {
    const next = new Set(selectedValues);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setSelectedValues(next);
  };

  const applyFilter = () => {
    if (selectedValues.size === 0 || selectedValues.size === uniqueValues.length) {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue(Array.from(selectedValues));
    }
    setOpen(false);
  };

  const clearFilter = () => {
    column.setFilterValue(undefined);
    setSelectedValues(new Set());
    setOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-semibold">{title}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            aria-label={`Filter ${title}`}
          >
            <Filter className={`h-4 w-4 ${isFiltered ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 shadow-xl" align="start">
          
          {/* Sorter Section */}
          <div className="flex flex-col p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs font-normal h-8"
              onClick={() => { column.toggleSorting(false); setOpen(false); }}
            >
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              الفرز من أ إلى ي (A to Z)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs font-normal h-8"
              onClick={() => { column.toggleSorting(true); setOpen(false); }}
            >
              <ArrowUpZA className="mr-2 h-4 w-4" />
              الفرز من ي إلى أ (Z to A)
            </Button>
          </div>

          <Separator />

          {/* Search and Checkboxes */}
          <Command>
            <CommandInput placeholder="البحث في القيم..." className="h-9 text-xs" />
            <CommandList>
              <CommandEmpty>لم يتم العثور على نتائج.</CommandEmpty>
              <CommandGroup>
                
                {/* Select All */}
                <CommandItem
                  onSelect={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer aria-selected:bg-accent/50"
                >
                  <Checkbox checked={allSelected} className="pointer-events-none" />
                  <span>(تحديد الكل)</span>
                </CommandItem>
                
                {/* Scrollable Values */}
                <ScrollArea className="h-48">
                  {uniqueValues.map(([val, count]) => {
                    const isChecked = selectedValues.has(val);
                    return (
                      <CommandItem
                        key={val}
                        value={val}
                        onSelect={() => toggleValue(val)}
                        className="flex items-center gap-2 text-xs cursor-pointer aria-selected:bg-accent/50"
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" />
                        <span className="flex-1 truncate">{val}</span>
                        <span className="text-[10px] text-muted-foreground mr-2">({count})</span>
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between p-2">
            <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 text-xs text-muted-foreground hover:text-destructive">
              <X className="mr-1 h-3 w-3" /> مسح
            </Button>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
                إلغاء
              </Button>
              <Button size="sm" onClick={applyFilter} className="h-8 text-xs bg-primary text-primary-foreground">
                <Check className="mr-1 h-3 w-3" /> موافق
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
