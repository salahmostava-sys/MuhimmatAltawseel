import { endOfMonth, format, getDate, getDaysInMonth, startOfMonth, subMonths } from 'date-fns';
import { predictRiderMonth, type RiderPrediction, type RiderPredictionInput } from '@services/predictionService';

export interface RiderPredictionEmployee {
  id: string;
  name: string;
}

export interface RiderPredictionOrderRow {
  employee_id: string | null;
  date: string;
  orders_count: number | null;
}

export interface RiderPredictionContext {
  employees: RiderPredictionEmployee[];
  orders: RiderPredictionOrderRow[];
}

function monthRange(referenceDate: Date, offset: number) {
  const target = subMonths(referenceDate, offset);
  return {
    start: format(startOfMonth(target), 'yyyy-MM-dd'),
    end: format(endOfMonth(target), 'yyyy-MM-dd'),
  };
}

function sumOrdersInRange(
  orders: RiderPredictionOrderRow[],
  employeeId: string,
  start: string,
  end: string,
): number {
  return orders
    .filter((row) => row.employee_id === employeeId && row.date >= start && row.date <= end)
    .reduce((sum, row) => sum + (Number(row.orders_count) || 0), 0);
}

function buildDailyOrdersLast14(
  orders: RiderPredictionOrderRow[],
  employeeId: string,
  referenceDate: Date,
): number[] {
  const daysPassedThisMonth = getDate(referenceDate);
  const currentMonthKey = format(referenceDate, 'yyyy-MM');
  const dailyMap: Record<string, number> = {};

  orders.forEach((row) => {
    if (row.employee_id !== employeeId) return;
    dailyMap[row.date] = (dailyMap[row.date] || 0) + (Number(row.orders_count) || 0);
  });

  return Array.from({ length: Math.min(14, daysPassedThisMonth) }, (_, index) => {
    const dayNum = daysPassedThisMonth - (13 - index);
    if (dayNum < 1) return 0;
    const dateKey = `${currentMonthKey}-${String(dayNum).padStart(2, '0')}`;
    return dailyMap[dateKey] || 0;
  });
}

export function buildRiderPredictionInputs(
  context: RiderPredictionContext,
  referenceDate: Date,
): RiderPredictionInput[] {
  const daysPassedThisMonth = getDate(referenceDate);
  const daysRemainingThisMonth = getDaysInMonth(referenceDate) - daysPassedThisMonth;
  const currentMonth = monthRange(referenceDate, 0);
  const lastMonth = monthRange(referenceDate, 1);
  const month2Ago = monthRange(referenceDate, 2);
  const month3Ago = monthRange(referenceDate, 3);
  const sameMonthLastYear = monthRange(referenceDate, 12);

  return context.employees.map((employee) => ({
    riderId: employee.id,
    riderName: employee.name,
    ordersThisMonthSoFar: sumOrdersInRange(context.orders, employee.id, currentMonth.start, currentMonth.end),
    dailyOrdersLast14: buildDailyOrdersLast14(context.orders, employee.id, referenceDate),
    daysPassedThisMonth,
    daysRemainingThisMonth,
    ordersLastMonth: sumOrdersInRange(context.orders, employee.id, lastMonth.start, lastMonth.end),
    ordersMonth2Ago: sumOrdersInRange(context.orders, employee.id, month2Ago.start, month2Ago.end),
    ordersMonth3Ago: sumOrdersInRange(context.orders, employee.id, month3Ago.start, month3Ago.end),
    ordersSameMonthLastYear: sumOrdersInRange(context.orders, employee.id, sameMonthLastYear.start, sameMonthLastYear.end),
  }));
}

export function buildRiderPredictions(
  context: RiderPredictionContext,
  referenceDate: Date,
): RiderPrediction[] {
  return buildRiderPredictionInputs(context, referenceDate)
    .map((input) => predictRiderMonth(input))
    .sort((left, right) => right.predictedTotal - left.predictedTotal);
}
