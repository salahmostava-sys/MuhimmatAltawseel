import type { WorkType } from '@shared/types/shifts';

type WorkTypeCarrier = {
  work_type?: WorkType | null;
};

export function isOrderCapableWorkType(workType?: WorkType | null): boolean {
  return workType !== 'shift';
}

export function isShiftCapableWorkType(workType?: WorkType | null): boolean {
  return workType === 'shift' || workType === 'hybrid';
}

export function isOrderCapableApp<T extends WorkTypeCarrier>(app: T): boolean {
  return isOrderCapableWorkType(app.work_type);
}

export function isShiftCapableApp<T extends WorkTypeCarrier>(app: T): boolean {
  return isShiftCapableWorkType(app.work_type);
}

export function getWorkTypeLabel(workType?: WorkType | null): string {
  if (workType === 'shift') return 'دوام';
  if (workType === 'hybrid') return 'مختلط';
  return 'طلبات';
}
