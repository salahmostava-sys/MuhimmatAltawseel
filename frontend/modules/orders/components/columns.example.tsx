/**
 * Example demonstrating how to use the newly created `DataTableExcelFilter`
 * with `@tanstack/react-table` inside your data grids.
 */

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableExcelFilter, BLANK_FILTER_VALUE } from '@shared/components/ui/data-table-excel-filter';

// 1. Imagine a DeliveryRecord type from Supabase
export type DeliveryRecord = {
  id: string;
  branch: string | null;
  driverStatus: string;
  amount: number;
};

type ExcelFilterRow = {
  getValue: (columnId: string) => unknown;
};

// 2. Define standard multi-select filter function matching the Excel behaviour
export const multiSelectFilterFn = (row: ExcelFilterRow, columnId: string, filterValues: string[]) => {
  if (!filterValues?.length) return true; // Show all if filter array empty
  
  const value = row.getValue(columnId);
  const isBlank = value === null || value === undefined || value === '';

  if (isBlank) return filterValues.includes(BLANK_FILTER_VALUE);
  return filterValues.includes(String(value));
};

// 3. Define the columns
export const deliveryColumns: ColumnDef<DeliveryRecord>[] = [
  {
    accessorKey: 'id',
    header: 'رقم الشحنة (ID)',
  },
  {
    accessorKey: 'branch',
    // Mount the Excel Filter Popover in the header
    header: ({ column }) => (
      <DataTableExcelFilter column={column} title="الفرع (Branch)" />
    ),
    // Link the filter function so the table knows how to filter the rows array
    filterFn: multiSelectFilterFn,
  },
  {
    accessorKey: 'driverStatus',
    header: ({ column }) => (
      <DataTableExcelFilter column={column} title="الحالة (Status)" />
    ),
    filterFn: multiSelectFilterFn,
  },
  {
    accessorKey: 'amount',
    header: 'المبلغ',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount')) || 0;
      return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
    },
  }
];
