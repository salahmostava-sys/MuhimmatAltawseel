import { useCallback, useState } from 'react';
import { isEmployeeIdUuid, isValidSalaryMonthYear } from '@shared/lib/salaryValidation';
import { salaryDataService } from '@services/salaryDataService';
import { employeeService } from '@services/employeeService';
import { salaryDraftService } from '@services/salaryDraftService';
import { buildSalaryRowSnapshot, getManualDeductionTotal } from '@modules/salaries/lib/salaryDomain';

import type { SalaryRow } from '@modules/salaries/types/salary.types';
import { getDisplayedBaseSalary } from '@modules/salaries/model/salaryUtils';
import { useSafeAction } from '@shared/hooks/useSafeAction';
import { logError } from '@shared/lib/logger';

import { toast as sonnerToast } from '@shared/components/ui/sonner';

// â”€â”€â”€ Params â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface UseSalaryPersistenceParams {
  rows: SalaryRow[];
  setRows: React.Dispatch<React.SetStateAction<SalaryRow[]>>;
  filtered: SalaryRow[];
  selectedMonth: string;
  toast: typeof sonnerToast;
  user: { id: string } | null;
  uid: string;
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>;
  payslipRow: SalaryRow | null;
  setPayslipRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
  setMarkingPaid: React.Dispatch<React.SetStateAction<string | null>>;
  setEmployeeFieldSaving: React.Dispatch<React.SetStateAction<string | null>>;
}

// â”€â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useSalaryPersistence(params: UseSalaryPersistenceParams) {
  const {
    rows: _rows,
    setRows,
    filtered,
    selectedMonth,
    toast,
    user,
    uid,
    queryClient,
    payslipRow,
    setPayslipRow,
    setMarkingPaid,
    setEmployeeFieldSaving,
  } = params;

  const { run } = useSafeAction({ toast, errorTitle: 'Ø­Ø¯Ø« Ø®Ø·Ø£' });

  const [approvingRowId, setApprovingRowId] = useState<string | null>(null);

  const resolveBaseSalaryForPersistence = useCallback(
    (row: SalaryRow, serverBaseSalary: number) => {
      const sheetBaseSalary = getDisplayedBaseSalary(row);
      return sheetBaseSalary > 0 ? sheetBaseSalary : serverBaseSalary;
    },
    [],
  );

  const refreshMonthSnapshot = useCallback(() => {
    salaryDataService.captureMonthSnapshot(selectedMonth).catch((error) => {
      logError('[Salaries] Failed to refresh salary month snapshot', error, { level: 'warn' });
    });
  }, [selectedMonth]);

  // â”€â”€ Row updater (shared helper) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const updateRow = useCallback(
    (id: string, patch: Partial<SalaryRow>) => {
      const patchChangesRow = (row: SalaryRow) =>
        Object.entries(patch).some(([key, value]) => {
          const currentValue = (row as unknown as Record<string, unknown>)[key];
          if (currentValue === value) return false;
          if (
            currentValue &&
            value &&
            typeof currentValue === 'object' &&
            typeof value === 'object'
          ) {
            return JSON.stringify(currentValue) !== JSON.stringify(value);
          }
          return true;
        });

      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...patch };
          if (patchChangesRow(r) && !('status' in patch) && !('isDirty' in patch)) {
            updated.isDirty = true;
          }
          return updated;
        }),
      );
      if (payslipRow?.id === id) setPayslipRow((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [payslipRow, setRows, setPayslipRow],
  );

  // â”€â”€ Compute server salary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // computeServerSalaryForPayment computes manualDeduction ONCE here and returns
  // it in the result â€” callers must NOT call getManualDeductionTotal separately
  // (P1: avoid redundant computation on each approve/pay call).
  const computeServerSalaryForPayment = useCallback(
    async (row: SalaryRow, monthYear: string) => {
      const manualDeduction = getManualDeductionTotal(row);
      const calcData = await salaryDataService.calculateSalaryForEmployeeMonth(
        row.employeeId,
        monthYear,
        row.paymentMethod,
        manualDeduction,
        null,
      );
      const calc = (Array.isArray(calcData) ? calcData[0] : calcData) as
        | Record<string, number>
        | undefined;
      const baseSalary = resolveBaseSalaryForPersistence(row, Number(calc?.base_salary ?? 0));
      const advanceDeduction = Number(calc?.advance_deduction ?? row.advanceDeduction ?? 0);
      const externalDeduction = Number(calc?.external_deduction ?? row.externalDeduction ?? 0);
      const totalAdditions = row.incentives + row.sickAllowance;
      const totalDeductions =
        row.violations + manualDeduction + advanceDeduction + externalDeduction;
      const netSalary = Math.max(baseSalary + totalAdditions - totalDeductions, 0);
      return {
        manualDeduction,
        baseSalary,
        advanceDeduction,
        externalDeduction,
        totalAdditions,
        netSalary,
      };
    },
    [resolveBaseSalaryForPersistence],
  );

  // â”€â”€ Settle advance installments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // FIX C1: replaced N sequential getAdvanceInstallmentStatuses queries with a
  // single bulk query (getInstallmentsByIds already returns all relevant rows).
  // We derive per-advance completion from those rows directly â€” O(1) DB calls.

  const settleAdvanceInstallments = useCallback(async (row: SalaryRow, nowStr: string) => {
    if (row.advanceInstallmentIds.length === 0) return;

    // Mark installments deducted first
    await salaryDataService.markInstallmentsDeducted(row.advanceInstallmentIds, nowStr);

    // Fetch all installments for these advances in ONE query (not N)
    const instData = await salaryDataService.getInstallmentsByIds(row.advanceInstallmentIds);
    if (!instData.length) return;

    // Build a map of advance_id â†’ Set of deducted installment ids we just marked
    const justDeductedIds = new Set(row.advanceInstallmentIds);

    // Group installments by advance â€” check if all are now deducted
    const advanceIdToStatuses = new Map<string, string[]>();
    for (const inst of instData) {
      const effective = justDeductedIds.has(inst.id ?? '') ? 'deducted' : inst.status;
      if (!advanceIdToStatuses.has(inst.advance_id)) {
        advanceIdToStatuses.set(inst.advance_id, []);
      }
      advanceIdToStatuses.get(inst.advance_id)!.push(effective as string);
    }

    // Complete any advance where all installments are now deducted â€” parallel, not serial
    const completions = [...advanceIdToStatuses.entries()]
      .filter(([, statuses]) => statuses.every((s) => s === 'deducted'))
      .map(([advId]) => salaryDataService.markAdvanceCompleted(advId));

    if (completions.length > 0) await Promise.all(completions);
  }, []);

  // â”€â”€ Approve single â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const approveRow = useCallback(
    async (id: string) => {
      // FIX W6b: guard against double-fire â€” if already approving any row, bail out.
      if (approvingRowId) return;

      // FIX W6c: read rows from the state updater to avoid stale closure.
      // We call setRows with an identity fn just to read the latest snapshot.
      const row = await new Promise<SalaryRow | undefined>((resolve) => {
        setRows((prev) => {
          resolve(prev.find((r) => r.id === id));
          return prev; // no mutation
        });
      });
      if (!row) return;
      if (!isEmployeeIdUuid(row.employeeId) || !isValidSalaryMonthYear(selectedMonth)) {
        toast.error('ØªØ¹Ø°Ù‘Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯', {
          description: 'Ù…Ø¹Ø±Ù Ø§Ù„Ù…ÙˆØ¸Ù Ø£Ùˆ Ø§Ù„Ø´Ù‡Ø± ØºÙŠØ± ØµØ§Ù„Ø­',
        });
        return;
      }

      setApprovingRowId(id);
      const calcResult = await run(
        () => computeServerSalaryForPayment(row, selectedMonth),
        { errorTitle: 'ØªØ¹Ø°Ù‘Ø± Ø­Ø³Ø§Ø¨ Ø§Ù„Ø±Ø§ØªØ¨ Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù…' },
      );
      if (!calcResult) {
        setApprovingRowId(null);
        return;
      }

      const { manualDeduction, baseSalary, advanceDeduction, externalDeduction, totalAdditions, netSalary } = calcResult;
      const rowSnapshot = buildSalaryRowSnapshot({
        ...row,
        advanceDeduction,
        externalDeduction,
      });

      const saved = await run(
        async () => {
          await salaryDataService.upsertSalaryRecord({
            employee_id: row.employeeId,
            month_year: selectedMonth,
            base_salary: baseSalary,
            allowances: totalAdditions,
            attendance_deduction: row.violations,
            advance_deduction: advanceDeduction,
            external_deduction: externalDeduction,
            manual_deduction: manualDeduction,
            net_salary: netSalary,
            is_approved: true,
            approved_by: user?.id ?? null,
            approved_at: new Date().toISOString(),
            payment_method: row.paymentMethod,
            sheet_snapshot: rowSnapshot,
          });
          return true;
        },
        { errorTitle: 'ØªØ¹Ø°Ù‘Ø± Ø­ÙØ¸ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯' },
      );
      if (!saved) {
        setApprovingRowId(null);
        return;
      }

      refreshMonthSnapshot();

      salaryDraftService.deleteDraft(selectedMonth, row.employeeId).catch((e) => {
        logError('[Salaries] Failed to clear draft after approve', e, { level: 'warn' });
      });

      updateRow(id, { status: 'approved', isDirty: false, advanceDeduction, externalDeduction });
      setApprovingRowId(null);
      toast.success('âœ… ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø±Ø§ØªØ¨');


    },
    [selectedMonth, toast, user, run, computeServerSalaryForPayment, updateRow, refreshMonthSnapshot, approvingRowId, setRows],
  );

  // â”€â”€ Mark as paid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const markAsPaid = useCallback(
    async (row: SalaryRow) => {
      if (!isEmployeeIdUuid(row.employeeId) || !isValidSalaryMonthYear(selectedMonth)) {
        toast.error('ØªØ¹Ø°Ù‘Ø± Ø§Ù„ØµØ±Ù', {
          description: 'Ù…Ø¹Ø±Ù Ø§Ù„Ù…ÙˆØ¸Ù Ø£Ùˆ Ø§Ù„Ø´Ù‡Ø± ØºÙŠØ± ØµØ§Ù„Ø­',
        });
        return;
      }
      setMarkingPaid(row.id);
      await run(
        async () => {
          const {
            manualDeduction,
            baseSalary,
            advanceDeduction,
            externalDeduction,
            totalAdditions,
            netSalary,
          } = await computeServerSalaryForPayment(row, selectedMonth);
          const nowStr = new Date().toISOString();
          const rowSnapshot = buildSalaryRowSnapshot({
            ...row,
            advanceDeduction,
            externalDeduction,
          });

          await salaryDataService.upsertSalaryRecord({
            employee_id: row.employeeId,
            month_year: selectedMonth,
            base_salary: baseSalary,
            allowances: totalAdditions,
            attendance_deduction: row.violations,
            advance_deduction: advanceDeduction,
            external_deduction: externalDeduction,
            manual_deduction: manualDeduction,
            net_salary: netSalary,
            is_approved: true,
            approved_by: user?.id ?? null,
            approved_at: nowStr,
            payment_method: row.paymentMethod,
            sheet_snapshot: rowSnapshot,
          });

          await settleAdvanceInstallments(row, nowStr);

          salaryDraftService.deleteDraft(selectedMonth, row.employeeId).catch((e) => {
            logError('[Salaries] Failed to clear draft after payment', e, { level: 'warn' });
          });

          // FIX C2: refreshMonthSnapshot moved inside run() so it only fires on success
          refreshMonthSnapshot();
          updateRow(row.id, {
            status: 'paid',
            isDirty: false,
            advanceDeduction,
            externalDeduction,
          });
          toast.success('âœ… ØªÙ… Ø§Ù„ØµØ±Ù ÙˆØ­ÙØ¸ Ø³Ø¬Ù„ Ø§Ù„Ø±Ø§ØªØ¨');
        },
        { errorTitle: 'Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØµØ±Ù' },
      );
      setMarkingPaid(null);
    },
    [selectedMonth, toast, user, run, computeServerSalaryForPayment, settleAdvanceInstallments, updateRow, setMarkingPaid, refreshMonthSnapshot],
  );

  // â”€â”€ Approve all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const approveAll = useCallback(async () => {
    // FIX #1: read fresh rows from state to prevent stale closure data.
    // filtered comes from a closure and may be outdated if rows changed since render.
    // We read fresh rows via setRows identity updater, then re-filter using filtered ids.
    const filteredIds = new Set(filtered.map((r) => r.id));
    const freshRows = await new Promise<SalaryRow[]>((resolve) => {
      setRows((prev) => { resolve(prev); return prev; });
    });
    const approvalRows = freshRows
      .filter((r) => filteredIds.has(r.id))
      .filter((r) => r.status === 'pending' || r.isDirty);
    if (approvalRows.length === 0) return;
    if (!isValidSalaryMonthYear(selectedMonth)) {
      toast.error('Ø®Ø·Ø£', { description: 'Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ù…Ø­Ø¯Ø¯ ØºÙŠØ± ØµØ§Ù„Ø­' });
      return;
    }

    const monthCalcData = await run(
      () => salaryDataService.calculateSalaryForMonth(selectedMonth),
      { errorTitle: 'Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨ Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù…' },
    );
    // FIX M7: undefined means run() caught an error and showed a toast â€” abort
    if (monthCalcData === undefined) return;

    // monthCalcData may be empty array if the RPC returned no rows (legitimate).
    // We handle rows with no server calc gracefully below via skippedRows.
    const monthCalcMap = new Map<string, Record<string, number>>(
      (Array.isArray(monthCalcData) ? monthCalcData : []).map((item) => [
        String((item as Record<string, unknown>).employee_id),
        item as Record<string, number>,
      ]),
    );

    const nowStr = new Date().toISOString();
    const skippedRows: string[] = [];
    const records = approvalRows
      .filter((row) => {
        const calc = monthCalcMap.get(row.employeeId);
        if (!calc && getDisplayedBaseSalary(row) <= 0) {
          skippedRows.push(row.employeeName);
          return false;
        }
        return true;
      })
      .map((row) => {
        const calc = monthCalcMap.get(row.employeeId);
        const manualDeduction = getManualDeductionTotal(row);
        const baseSalary = resolveBaseSalaryForPersistence(row, Number(calc?.base_salary ?? 0));
        const advanceDeduction = Number(calc?.advance_deduction ?? row.advanceDeduction ?? 0);
        const externalDeduction = Number(calc?.external_deduction ?? row.externalDeduction ?? 0);
        const totalAdditions = row.incentives + row.sickAllowance;
        const totalDeductions =
          row.violations + manualDeduction + advanceDeduction + externalDeduction;
        const netSalary = Math.max(baseSalary + totalAdditions - totalDeductions, 0);
        const rowSnapshot = buildSalaryRowSnapshot({
          ...row,
          advanceDeduction,
          externalDeduction,
        });
        return {
          employee_id: row.employeeId,
          month_year: selectedMonth,
          base_salary: baseSalary,
          allowances: totalAdditions,
          attendance_deduction: row.violations,
          advance_deduction: advanceDeduction,
          external_deduction: externalDeduction,
          manual_deduction: manualDeduction,
          net_salary: netSalary,
          is_approved: true,
          approved_by: user?.id ?? null,
          approved_at: nowStr,
          payment_method: row.paymentMethod,
          sheet_snapshot: rowSnapshot,
        };
      });

    const saved = await run(
      async () => {
        await salaryDataService.upsertSalaryRecords(records);
        return true;
      },
      { errorTitle: 'Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯' },
    );
    if (!saved) return;

    refreshMonthSnapshot();

    const approvedIds = new Set(records.map((r) => r.employee_id));
    const approvedRowIds = new Set(
      approvalRows
        .filter((r) => approvedIds.has(r.employeeId))
        .map((r) => r.id)
    );
    await Promise.all(
      approvalRows
        .filter((r) => approvedIds.has(r.employeeId))
        .map((r) =>
          salaryDraftService.deleteDraft(selectedMonth, r.employeeId).catch((e) => {
            logError('[Salaries] Failed to clear draft after bulk approve', e, { level: 'warn' });
          }),
        ),
    );
    setRows((prev) =>
      prev.map((r) => (
        approvedRowIds.has(r.id)
          ? { ...r, status: 'approved' as const, isDirty: false }
          : r
      )),
    );
    if (skippedRows.length > 0) {
      toast.warning(`ØªÙ… ØªØ®Ø·ÙŠ ${skippedRows.length} Ù…ÙˆØ¸Ù (Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨ Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù…)`, {
        description: skippedRows.join('ØŒ '),
      });
    }
    toast.success(`âœ… ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ ${records.length} Ø±Ø§ØªØ¨ ÙˆØ­ÙØ¸Ù‡Ø§`);
  }, [filtered, selectedMonth, toast, user, run, setRows, resolveBaseSalaryForPersistence, refreshMonthSnapshot]);

  // â”€â”€ Persist employee fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const persistEmployeeCity = useCallback(
    async (row: SalaryRow, nextCity: 'makkah' | 'jeddah') => {
      if (row.cityKey === nextCity) return;
      setEmployeeFieldSaving(`${row.employeeId}:city`);
      await run(
        async () => {
          await employeeService.updateEmployee(row.employeeId, { city: nextCity });
          // FIX C4: correct query key â€” was 'base-context', now 'context' to match useSalaryData
          await queryClient.invalidateQueries({
            queryKey: ['salaries', uid, 'context', selectedMonth],
          });
          toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØ±Ø¹');
        },
        { errorTitle: 'ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØ±Ø¹' },
      );
      setEmployeeFieldSaving(null);
    },
    [toast, queryClient, uid, selectedMonth, setEmployeeFieldSaving, run],
  );

  const persistEmployeePaymentMethod = useCallback(
    (row: SalaryRow, next: 'bank' | 'cash') => {
      if (row.paymentMethod === next) return;
      if (next === 'bank' && !row.hasIban) {
        toast.error('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù‚Ù… Ø¢ÙŠØ¨Ø§Ù†', {
          description: 'Ø£Ø¶Ù Ø±Ù‚Ù… Ø§Ù„ØآØ¨Ø§Ù† Ù…Ù† Ù…Ù„Ù Ø§Ù„Ù…ÙˆØ¸Ù Ù‚Ø¨Ù„ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ØAAØحÙˆÙŠÙ„ Ø§Ù„Ø¨Ù†ÙƒÙŠ.',
        });
        return;
      }
      setEmployeeFieldSaving(`${row.employeeId}:payment`);
      updateRow(row.id, { paymentMethod: next });
      toast.success('ØªÙ… ØAAØحØ¯ÙŠØ« Ø·ØرÙŠÙ‚Ø© Ø§Ù„ØµØ±Ùڤ â€” Ø§ØعØAAÙ…Ø¯ Ø§Ù„Ø±Ø§ØAAØ¨ Ù„ØُÙØ¸ Ø§Ù„ØAAØBAÙŠÙŠØ± Ù†Ù‡Ø§Ø¦ØŠØ§Ù‹');
      setEmployeeFieldSaving(null);
    },
    [toast, setEmployeeFieldSaving, updateRow],
  );

  return {
    updateRow,
    approveRow,
    approvingRowId,
    markAsPaid,
    approveAll,
    persistEmployeeCity,
    persistEmployeePaymentMethod,
    computeServerSalaryForPayment,
    settleAdvanceInstallments,
  };
}
