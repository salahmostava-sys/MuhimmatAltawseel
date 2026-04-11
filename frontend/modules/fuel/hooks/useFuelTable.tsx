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
      'Ø§Ù„Ø§Ø³Ù…': r.employee_name,
      'Ø£ÙŠØ§Ù… Ù…Ø³Ø¬Ù‘Ù„Ø©': r.daily_count,
      'Ø§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª': r.km_total,
      'ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ù†Ø²ÙŠÙ† (Ø±.Ø³)': r.fuel_cost,
      'ØªÙƒÙ„ÙØ©/ÙƒÙ… (Ø±.Ø³)': r.km_total > 0 ? (r.fuel_cost / r.km_total).toFixed(3) : '',
      'Ø¹Ø¯Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª': r.orders_count,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ù…Ù„Ø®Øµ Ø´Ù‡Ø±ÙŠ');
    XLSX.writeFile(wb, `Ù…Ù„Ø®Øµ_Ø§Ù„Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handleExportDaily = () => {
    const data = filteredDaily.map(r => ({
      'Ø§Ù„ØªØ§Ø±ÙŠØ®': r.date,
      'Ø§Ù„ÙŠÙˆÙ…': DAY_NAMES[new Date(r.date + 'T12:00:00').getDay()],
      'Ø§Ù„Ø§Ø³Ù…': r.employee?.name || '',
      'Ø§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª': r.km_total,
      'ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ù†Ø²ÙŠÙ† (Ø±.Ø³)': r.fuel_cost,
      'Ù…Ù„Ø§Ø­Ø¸Ø§Øª': r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ø¥Ø¯Ø®Ø§Ù„Ø§Øª ÙŠÙˆÙ…ÙŠØ©');
    XLSX.writeFile(wb, `Ø¥Ø¯Ø®Ø§Ù„Ø§Øª_ÙŠÙˆÙ…ÙŠØ©_${selectedMonth}_${selectedYear}.xlsx`);
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
