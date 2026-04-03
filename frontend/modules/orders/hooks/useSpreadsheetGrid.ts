import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { usePermissions } from '@shared/hooks/usePermissions';
import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC } from '@shared/lib/toastMessages';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { orderService } from '@services/orderService';
import { bulkDeleteService } from '@services/bulkDeleteService';
import type { DailyData } from '@modules/orders/types';
import type { OrdersPopoverState } from '@shared/components/orders/OrdersCellPopover';
import type { UnmatchedEmployeeName } from '@shared/lib/nameMatching';
import { useSpreadsheetQueries } from '@modules/orders/hooks/useSpreadsheetQueries';
import {
  calculatePlatformTotals,
  collectEmployeeIdsWithOrdersOnApp,
} from '@modules/orders/utils/gridHelpers';
import {
  exportSpreadsheetExcel,
  runSpreadsheetImport,
  downloadSpreadsheetTemplate,
  printSpreadsheetTable,
  saveSpreadsheetMonth,
} from '@modules/orders/utils/spreadsheetFileOps';
import { getDaysInMonth, monthYear, shiftMonth, isPastMonth } from '@modules/orders/utils/dateMonth';

import { useTemporalContext } from '@app/providers/TemporalContext';

export function useSpreadsheetGrid() {
  const queryClient = useQueryClient();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('orders');
  const { selectedMonth: globalMonth, setSelectedMonth: setGlobalMonth } = useTemporalContext();

  // Derived from Global Temporal Context (YYYY-MM)
  const [yearStr, monthStr] = globalMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const [search, setSearch] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const [data, setData] = useState<DailyData>({});
  const [saving, setSaving] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState<Set<string>>(new Set());
  const [cellPopover, setCellPopover] = useState<OrdersPopoverState | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [lockingMonth, setLockingMonth] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showNameMappingDialog, setShowNameMappingDialog] = useState(false);
  const [unmatchedNames, setUnmatchedNames] = useState<UnmatchedEmployeeName[]>([]);
  const [nameMappingCallback, setNameMappingCallback] = useState<((mapping: Map<string, string>) => void) | null>(null);

  const monthKey = monthYear(year, month);
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(monthKey);
  const activeEmployeeIdsInMonth = activeIdsData?.orderEmployeeIds;

  const sq = useSpreadsheetQueries(uid, enabled, year, month, activeEmployeeIdsInMonth);
  const canEditMonth = permissions.can_edit && !isMonthLocked;

  useEffect(() => {
    setData(sq.spreadsheetMonthData);
  }, [sq.spreadsheetMonthData]);

  useEffect(() => {
    setIsMonthLocked(sq.spreadsheetMonthLock);
  }, [sq.spreadsheetMonthLock]);

  useEffect(() => {
    const error = sq.spreadsheetBaseError || sq.spreadsheetMonthError || sq.spreadsheetLockError;
    if (!error) return;
    const message = error instanceof Error ? error.message : 'فشل تحميل بيانات الطلبات';
    toast.error(TOAST_ERROR_GENERIC, { description: message });
  }, [sq.spreadsheetBaseError, sq.spreadsheetMonthError, sq.spreadsheetLockError]);

  const employeeIdsWithOrdersOnFilteredPlatform = useMemo(() => {
    if (platformFilter === 'all') return new Set<string>();
    return collectEmployeeIdsWithOrdersOnApp(data, platformFilter);
  }, [data, platformFilter]);

  const baseEmployees = useMemo(() => {
    if (platformFilter === 'all') {
      // Show all employees who have at least one active platform assignment OR have orders
      const employeesWithPlatforms = sq.employees.filter(e => {
        const hasAssignment = Object.values(sq.appEmployeeIds).some(appSet => appSet?.has(e.id));
        const hasOrders = Object.keys(data).some(key => key.startsWith(`${e.id}::`));
        return hasAssignment || hasOrders;
      });
      return employeesWithPlatforms;
    }
    // For specific platform filter
    const assigned = sq.appEmployeeIds[platformFilter];
    const withOrders = employeeIdsWithOrdersOnFilteredPlatform;
    return sq.employees.filter((e) => Boolean(assigned?.has(e.id)) || withOrders.has(e.id));
  }, [sq.employees, platformFilter, sq.appEmployeeIds, employeeIdsWithOrdersOnFilteredPlatform, data]);

  const filteredEmployees = useMemo(
    () => baseEmployees.filter((emp) => emp.name.includes(search)),
    [baseEmployees, search],
  );
  const visibleApps = platformFilter === 'all' ? sq.apps : sq.apps.filter((a) => a.id === platformFilter);
  const now = new Date();
  const days = getDaysInMonth(year, month);
  const dayArr = Array.from({ length: days }, (_, i) => i + 1);
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;

  const getVal = useCallback(
    (empId: string, appId: string, day: number) => data[`${empId}::${appId}::${day}`] ?? 0,
    [data],
  );
  const getActiveApps = useCallback(
    (empId: string) => visibleApps.filter((app) => dayArr.some((d) => getVal(empId, app.id, d) > 0)),
    [visibleApps, dayArr, getVal],
  );
  const empDayTotal = useCallback(
    (empId: string, day: number) => visibleApps.reduce((s, a) => s + getVal(empId, a.id, day), 0),
    [visibleApps, getVal],
  );
  const empMonthTotal = useCallback(
    (empId: string) => dayArr.reduce((s, d) => s + empDayTotal(empId, d), 0),
    [dayArr, empDayTotal],
  );
  const empAppMonthTotal = useCallback(
    (empId: string, appId: string) => dayArr.reduce((s, d) => s + getVal(empId, appId, d), 0),
    [dayArr, getVal],
  );

  const monthGrandTotal = useMemo(
    () => filteredEmployees.reduce((s, e) => s + empMonthTotal(e.id), 0),
    [filteredEmployees, empMonthTotal],
  );
  const monthDailyAvg = days > 0 ? Math.round(monthGrandTotal / days) : 0;
  const platformOrderTotals = useMemo(
    () => calculatePlatformTotals(sq.apps, filteredEmployees, dayArr, data),
    [sq.apps, filteredEmployees, dayArr, data],
  );

  const prevMonth = () => {
    const n = shiftMonth(year, month, -1);
    setGlobalMonth(`${n.y}-${String(n.m).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const n = shiftMonth(year, month, 1);
    setGlobalMonth(`${n.y}-${String(n.m).padStart(2, '0')}`);
  };

  const toggleExpand = (empId: string) => {
    setExpandedEmp((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const handleCellClick = useCallback(
    (e: React.MouseEvent, empId: string, day: number) => {
      if (!canEditMonth) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setCellPopover({ empId, day, x: rect.left, y: rect.bottom });
    },
    [canEditMonth],
  );

  const handlePopoverApply = useCallback((empId: string, day: number, vals: Record<string, number>) => {
    setData((prev) => {
      const next = { ...prev };
      Object.entries(vals).forEach(([appId, count]) => {
        const key = `${empId}::${appId}::${day}`;
        if (count > 0) next[key] = count;
        else delete next[key];
      });
      return next;
    });
  }, []);

  const exportExcel = () =>
    void exportSpreadsheetExcel({
      year,
      month,
      dayArr,
      filteredEmployees,
      empDayTotal,
      empMonthTotal,
    });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setShowImportDialog(true);
    e.target.value = '';
  };

  const handleImportConfirm = async (targetAppId: string | undefined) => {
    setShowImportDialog(false);
    if (!pendingImportFile) return;
    await runSpreadsheetImport({
      file: pendingImportFile,
      dayArr,
      employees: sq.employees,
      apps: sq.apps,
      data,
      onApplyData: setData,
      targetAppId,
      onShowNameMapping: (unmatched, callback) => {
        setUnmatchedNames(unmatched);
        setNameMappingCallback(() => callback);
        setShowNameMappingDialog(true);
      },
    });
    setPendingImportFile(null);
  };

  const handleNameMappingConfirm = (mapping: Map<string, string>) => {
    setShowNameMappingDialog(false);
    if (nameMappingCallback) {
      nameMappingCallback(mapping);
      setNameMappingCallback(null);
    }
    setUnmatchedNames([]);
  };

  const handleNameMappingCancel = () => {
    setShowNameMappingDialog(false);
    setUnmatchedNames([]);
    setNameMappingCallback(null);
  };

  const handleImportCancel = () => {
    setShowImportDialog(false);
    setPendingImportFile(null);
  };

  const handleTemplate = () => void downloadSpreadsheetTemplate(dayArr);

  const handlePrint = () =>
    printSpreadsheetTable({
      tableEl: tableRef.current,
      year,
      month,
      filteredEmployeeCount: filteredEmployees.length,
    });

  const handleSave = () =>
    void saveSpreadsheetMonth({
      isMonthLocked,
      year,
      month,
      days,
      data,
      setSaving,
    });

  const handleLockMonth = async () => {
    const my = monthYear(year, month);
    setLockingMonth(true);
    try {
      if (isMonthLocked) {
        await orderService.unlockMonth(my);
        setIsMonthLocked(false);
        toast.success('تم فتح الشهر بنجاح');
      } else {
        if (!isPastMonth(year, month)) {
          toast.error('لا يمكن قفل الشهر الحالي أو المستقبلي');
          setLockingMonth(false);
          return;
        }
        await orderService.lockMonth(my);
        setIsMonthLocked(true);
        setCellPopover(null);
        toast.success('تم قفل الشهر بنجاح');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'فشل العملية';
      toast.error(TOAST_ERROR_GENERIC, { description: message });
    } finally {
      setLockingMonth(false);
    }
  };

  const handleBulkDelete = async (
    scope: 'employee_month' | 'employee_app_month' | 'app_month' | 'day',
    filters: { employeeId?: string; appId?: string; day?: number }
  ) => {
    try {
      const my = monthYear(year, month);
      let count = 0;

      if (scope === 'employee_month' && filters.employeeId) {
        count = await bulkDeleteService.deleteEmployeeMonth(filters.employeeId, my);
      } else if (scope === 'employee_app_month' && filters.employeeId && filters.appId) {
        count = await bulkDeleteService.deleteEmployeeAppMonth(filters.employeeId, filters.appId, my);
      } else if (scope === 'app_month' && filters.appId) {
        count = await bulkDeleteService.deleteAppMonth(filters.appId, my);
      } else if (scope === 'day' && filters.day) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(filters.day).padStart(2, '0')}`;
        count = await bulkDeleteService.deleteDay(date);
      }

      toast.success(`تم حذف ${count} طلب بنجاح`);
      await queryClient.invalidateQueries({ queryKey: sq.qk.spreadsheetMonthRaw(year, month) });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'فشل الحذف';
      toast.error(TOAST_ERROR_GENERIC, { description: message });
      throw e;
    }
  };

  const seqColMin = 36;
  const repColMin = 132;

  return {
    uid,
    loading: sq.loading,
    apps: sq.apps,
    employees: sq.employees,
    data,
    setData,
    year,
    month,
    search,
    setSearch,
    importRef,
    tableRef,
    saving,
    expandedEmp,
    cellPopover,
    setCellPopover,
    platformFilter,
    setPlatformFilter,
    isMonthLocked,
    lockingMonth,
    permissions,
    canEditMonth,
    filteredEmployees,
    visibleApps,
    days,
    dayArr,
    today,
    getVal,
    getActiveApps,
    empDayTotal,
    empMonthTotal,
    empAppMonthTotal,
    monthGrandTotal,
    monthDailyAvg,
    platformOrderTotals,
    prevMonth,
    nextMonth,
    toggleExpand,
    handleCellClick,
    handlePopoverApply,
    exportExcel,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
    showImportDialog,
    handleTemplate,
    handlePrint,
    handleSave,
    handleLockMonth,
    handleBulkDelete,
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    showNameMappingDialog,
    unmatchedNames,
    handleNameMappingConfirm,
    handleNameMappingCancel,
    seqColMin,
    repColMin,
  };
}
