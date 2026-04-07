import { useCallback } from 'react';
import { sendWhatsAppMessage } from '@shared/lib/whatsapp';
import { isEmployeeIdUuid, isValidSalaryMonthYear } from '@shared/lib/salaryValidation';
import { salaryDataService } from '@services/salaryDataService';
import { driverService } from '@services/driverService';
import { salaryDraftService } from '@services/salaryDraftService';
import { buildSalaryRowSnapshot, getManualDeductionTotal } from '@modules/salaries/lib/salaryDomain';
import { months } from '@modules/salaries/lib/salaryMonths';
import type { SalaryRow } from '@modules/salaries/types/salary.types';
import { getDisplayedBaseSalary } from '@modules/salaries/model/salaryUtils';
import { useSafeAction } from '@shared/hooks/useSafeAction';
import { logError } from '@shared/lib/logger';

import { toast as sonnerToast } from '@shared/components/ui/sonner';

// ─── Params ──────────────────────────────────────────────────────────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSalaryPersistence(params: UseSalaryPersistenceParams) {
  const {
    rows,
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

  const { run } = useSafeAction({ toast, errorTitle: 'حدث خطأ' });

  const resolveBaseSalaryForPersistence = useCallback(
    (row: SalaryRow, serverBaseSalary: number) => {
      const sheetBaseSalary = getDisplayedBaseSalary(row);
      return sheetBaseSalary > 0 ? sheetBaseSalary : serverBaseSalary;
    },
    [],
  );

  const refreshMonthSnapshot = useCallback(() => {
    void salaryDataService.captureMonthSnapshot(selectedMonth).catch((error) => {
      logError('[Salaries] Failed to refresh salary month snapshot', error, { level: 'warn' });
    });
  }, [selectedMonth]);

  // ── Row updater (shared helper) ───────────────────────────────────────────

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

  // ── Compute server salary ─────────────────────────────────────────────────

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

  // ── Settle advance installments ───────────────────────────────────────────

  const settleAdvanceInstallments = useCallback(async (row: SalaryRow, nowStr: string) => {
    if (row.advanceInstallmentIds.length === 0) return;
    await salaryDataService.markInstallmentsDeducted(row.advanceInstallmentIds, nowStr);
    const instData = await salaryDataService.getInstallmentsByIds(row.advanceInstallmentIds);
    if (!instData.length) return;
    const advanceIds = [...new Set(instData.map((i) => i.advance_id))];
    for (const advId of advanceIds) {
      const allInsts = await salaryDataService.getAdvanceInstallmentStatuses(advId);
      if (allInsts.every((i) => i.status === 'deducted')) {
        await salaryDataService.markAdvanceCompleted(advId);
      }
    }
  }, []);

  // ── Approve single ────────────────────────────────────────────────────────

  const approveRow = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      if (!isEmployeeIdUuid(row.employeeId) || !isValidSalaryMonthYear(selectedMonth)) {
        toast.error('تعذّر الاعتماد', {
          description: 'معرف الموظف أو الشهر غير صالح',
        });
        return;
      }

      const calcResult = await run(
        async () => computeServerSalaryForPayment(row, selectedMonth),
        { errorTitle: 'تعذّر حساب الراتب من الخادم' },
      );
      if (!calcResult) return;

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
        { errorTitle: 'تعذّر حفظ الاعتماد' },
      );
      if (!saved) return;

      refreshMonthSnapshot();

      void salaryDraftService.deleteDraft(selectedMonth, row.employeeId).catch((e) => {
        logError('[Salaries] Failed to clear draft after approve', e, { level: 'warn' });
      });

      updateRow(id, { status: 'approved', isDirty: false, advanceDeduction, externalDeduction });
      toast.success('✅ تم اعتماد الراتب');

      if (row.phone) {
        const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;
        sendWhatsAppMessage(
          row.phone,
          `مرحباً ${row.employeeName} 👋\n\nتم اعتماد راتبك لشهر ${monthLabel}\nصافي الراتب: ${netSalary.toLocaleString()} ر.س\n\nللاستفسار تواصل مع الإدارة.`,
        ).then((ok) => {
          if (!ok) toast.error('تعذّر إرسال إشعار واتساب');
        });
      }
    },
    [rows, selectedMonth, toast, user, run, computeServerSalaryForPayment, updateRow, refreshMonthSnapshot],
  );

  // ── Mark as paid ──────────────────────────────────────────────────────────

  const markAsPaid = useCallback(
    async (row: SalaryRow) => {
      if (!isEmployeeIdUuid(row.employeeId) || !isValidSalaryMonthYear(selectedMonth)) {
        toast.error('تعذّر الصرف', {
          description: 'معرف الموظف أو الشهر غير صالح',
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

          void salaryDraftService.deleteDraft(selectedMonth, row.employeeId).catch((e) => {
            logError('[Salaries] Failed to clear draft after payment', e, { level: 'warn' });
          });

          updateRow(row.id, {
            status: 'paid',
            isDirty: false,
            advanceDeduction,
            externalDeduction,
          });
          toast.success('✅ تم الصرف وحفظ سجل الراتب');

          if (row.phone) {
            const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;
            sendWhatsAppMessage(
              row.phone,
              `مرحباً ${row.employeeName} 👋\n\n✅ تم صرف راتبك لشهر ${monthLabel}\nالمبلغ: ${netSalary.toLocaleString()} ر.س\n\nشكراً لجهودك.`,
            ).then((ok) => {
              if (!ok) toast.error('تعذّر إرسال إشعار واتساب');
            });
          }
        },
        { errorTitle: 'خطأ أثناء الصرف' },
      );
      refreshMonthSnapshot();
      setMarkingPaid(null);
    },
    [selectedMonth, toast, user, run, computeServerSalaryForPayment, settleAdvanceInstallments, updateRow, setMarkingPaid, refreshMonthSnapshot],
  );

  // ── Approve all ───────────────────────────────────────────────────────────

  const approveAll = useCallback(async () => {
    const approvalRows = filtered.filter((r) => r.status === 'pending' || r.isDirty);
    if (approvalRows.length === 0) return;
    if (!isValidSalaryMonthYear(selectedMonth)) {
      toast.error('خطأ', { description: 'الشهر المحدد غير صالح' });
      return;
    }

    const monthCalcData = await run(
      async () => salaryDataService.calculateSalaryForMonth(selectedMonth),
      { errorTitle: 'خطأ أثناء الحساب من الخادم' },
    );
    if (monthCalcData === undefined) return;

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
      { errorTitle: 'خطأ أثناء الاعتماد' },
    );
    if (!saved) return;

    refreshMonthSnapshot();

    const approvedIds = records.map((r) => r.employee_id);
    const approvedRowIds = approvalRows
      .filter((r) => approvedIds.includes(r.employeeId))
      .map((r) => r.id);
    await Promise.all(
      approvalRows
        .filter((r) => approvedIds.includes(r.employeeId))
        .map((r) =>
          salaryDraftService.deleteDraft(selectedMonth, r.employeeId).catch((e) => {
            logError('[Salaries] Failed to clear draft after bulk approve', e, { level: 'warn' });
          }),
        ),
    );
    setRows((prev) =>
      prev.map((r) => (
        approvedRowIds.includes(r.id)
          ? { ...r, status: 'approved' as const, isDirty: false }
          : r
      )),
    );
    if (skippedRows.length > 0) {
      toast.warning(`تم تخطي ${skippedRows.length} موظف (لا يوجد حساب من الخادم)`, {
        description: skippedRows.join('، '),
      });
    }
    toast.success(`✅ تم اعتماد ${records.length} راتب وحفظها`);
  }, [filtered, selectedMonth, toast, user, run, setRows, resolveBaseSalaryForPersistence, refreshMonthSnapshot]);

  // ── Persist employee fields ───────────────────────────────────────────────

  const persistEmployeeCity = useCallback(
    async (row: SalaryRow, nextCity: 'makkah' | 'jeddah') => {
      if (row.cityKey === nextCity) return;
      setEmployeeFieldSaving(`${row.employeeId}:city`);
      await run(
        async () => {
          await driverService.update(row.employeeId, { city: nextCity });
          await queryClient.invalidateQueries({
            queryKey: ['salaries', uid, 'base-context', selectedMonth],
          });
          toast.success('تم تحديث الفرع');
        },
        { errorTitle: 'فشل تحديث الفرع' },
      );
      setEmployeeFieldSaving(null);
    },
    [toast, queryClient, uid, selectedMonth, setEmployeeFieldSaving, run],
  );

  const persistEmployeePaymentMethod = useCallback(
    async (row: SalaryRow, next: 'bank' | 'cash') => {
      if (row.paymentMethod === next) return;
      if (next === 'bank' && !row.hasIban) {
        toast.error('لا يوجد رقم آيبان', {
          description: 'أضف رقم الآيبان من ملف الموظف قبل اختيار التحويل البنكي.',
        });
        return;
      }
      setEmployeeFieldSaving(`${row.employeeId}:payment`);
      updateRow(row.id, { paymentMethod: next });
      toast.success('تم تحديث طريقة الصرف');
      setEmployeeFieldSaving(null);
    },
    [toast, setEmployeeFieldSaving, updateRow],
  );

  return {
    updateRow,
    approveRow,
    markAsPaid,
    approveAll,
    persistEmployeeCity,
    persistEmployeePaymentMethod,
    computeServerSalaryForPayment,
    settleAdvanceInstallments,
  };
}
