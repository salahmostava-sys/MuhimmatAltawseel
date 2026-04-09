export type AdvanceStatus = 'active' | 'completed' | 'paused';
export type InstallmentStatus = 'pending' | 'deducted' | 'deferred';

export type Installment = {
  id: string;
  advance_id: string;
  month_year: string;
  amount: number;
  status: InstallmentStatus;
  deducted_at: string | null;
  notes: string | null;
};

export type Advance = {
  id: string;
  employee_id: string;
  amount: number;
  monthly_amount: number;
  total_installments: number;
  disbursement_date: string;
  first_deduction_month: string;
  status: AdvanceStatus;
  note: string | null;
  created_at: string;
  is_written_off?: boolean;
  written_off_reason?: string | null;
  employees?: { name: string; national_id: string | null } | null;
  advance_installments?: Installment[];
};

export interface InlineRowProps {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export interface WriteOffDialogProps {
  employeeName: string;
  remaining: number;
  advanceIds: string[];
  onClose: () => void;
  onDone: () => void;
}

export interface RestoreWriteOffDialogProps {
  employeeName: string;
  advanceIds: string[];
  onClose: () => void;
  onDone: () => void;
}

export interface EditAdvanceModalProps {
  advance: Advance;
  onClose: () => void;
  onSaved: () => void;
}

export interface PrintSlipProps {
  employeeName: string;
  nationalId: string;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  advances: Advance[];
  onClose: () => void;
}

export interface TransactionsModalProps {
  employeeId: string;
  employeeName: string;
  nationalId: string;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  advances: Advance[];
  allAdvances: Advance[];
  isWrittenOff?: boolean;
  canEdit?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onWriteOff?: () => void;
  onRestore?: () => void;
  onEditAdvance?: (adv: Advance) => void;
}

export type EmployeeSummary = {
  employeeId: string;
  employeeName: string;
  nationalId: string;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  activeAdvances: Advance[];
  allAdvances: Advance[];
  isWrittenOff: boolean;
  /** أحدث تاريخ صرف بين سلف هذا المندوب (للفلترة على الأعمدة) */
  latestDisbursementDate: string;
};

export const calcPaid = (installments: Installment[]) =>
  installments.filter(i => i.status === 'deducted').reduce((s, i) => s + i.amount, 0);
export const calcPending = (installments: Installment[]) =>
  installments.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);

export const buildInstallmentsPayload = (
  advanceId: string,
  firstMonthYear: string,
  totalAmount: number,
  installmentCount: number
) => {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || installmentCount <= 0) return [];
  const list = [];
  const baseAmount = Math.round(totalAmount / installmentCount);
  let remaining = totalAmount;
  let [yr, mo] = firstMonthYear.split('-').map(Number);

  for (let i = 0; i < installmentCount; i++) {
    const isLast = i === installmentCount - 1;
    const amount = isLast ? remaining : baseAmount;
    list.push({
      advance_id: advanceId,
      month_year: `${yr}-${String(mo).padStart(2, '0')}`,
      amount,
      status: 'pending' as const,
    });
    remaining -= amount;
    mo++;
    if (mo > 12) {
      mo = 1;
      yr++;
    }
  }

  return list;
};
