import { useRef, useState } from 'react';
import { createDefaultGlobalFilters } from '@shared/components/table/GlobalTableFilters';
import type { DailyRow, MonthlyRow } from '@modules/fuel/types/fuel.types';
import { DAY_NAMES } from '@modules/fuel/types/fuel.types';

export function useFuelTable(args: {
  view: 'monthly' | 'daily' | 'spreadsheet';
  filteredMonthly: MonthlyRow[];
  filteredDaily: DailyRow[];
  selectedMonth: string;
  selectedYear: string;
}) {
  const {
    filteredMonthly,
    filteredDaily,
    selectedMonth,
    selectedYear,
  } = args;

  const tableRef = useRef<HTMLTableElement>(null);
  const [fastDailyPage, setFastDailyPage] = useState(1);
  const [fastDailyPageSize] = useState(50);
  const [fastDailyFilters, setFastDailyFilters] = useState(() => createDefaultGlobalFilters());

  const handleExportMonthly = () => {
    const data = filteredMonthly.map(r => ({
      'ا�„اس�…': r.employee_name,
      'أ�Šا�… �…سج�‘�„ة': r.daily_count,
      'ا�„�ƒ�Š�„�ˆ�…ترات': r.km_total,
      'ت�ƒ�„فة ا�„ب�†ز�Š�† (ر.س)': r.fuel_cost,
      'ت�ƒ�„فة/�ƒ�… (ر.س)': r.km_total > 0 ? (r.fuel_cost / r.km_total).toFixed(3) : '',
      'عدد ا�„ط�„بات': r.orders_count,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '�…�„خص ش�‡ر�Š');
    XLSX.writeFile(wb, `�…�„خص_ا�„است�‡�„ا�ƒ_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handleExportDaily = () => {
    const data = filteredDaily.map(r => ({
      'ا�„تار�Šخ': r.date,
      'ا�„�Š�ˆ�…': DAY_NAMES[new Date(r.date + 'T12:00:00').getDay()],
      'ا�„اس�…': r.employee?.name || '',
      'ا�„�ƒ�Š�„�ˆ�…ترات': r.km_total,
      'ت�ƒ�„فة ا�„ب�†ز�Š�† (ر.س)': r.fuel_cost,
      '�…�„احظات': r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'إدخا�„ات �Š�ˆ�…�Šة');
    XLSX.writeFile(wb, `إدخا�„ات_�Š�ˆ�…�Šة_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return {
    tableRef,
    handleExportMonthly,
    handleExportDaily,
    fastDailyPage,
    setFastDailyPage,
    fastDailyPageSize,
    fastDailyFilters,
    setFastDailyFilters,
  };
}
