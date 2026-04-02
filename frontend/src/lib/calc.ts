export const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);
export const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0);
export const safeDiv = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;

