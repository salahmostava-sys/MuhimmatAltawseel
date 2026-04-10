/**
 * Table sort column indicators — avoids nested ternaries in JSX (Sonar maintainability).
 */
export function sortArrowGlyph(activeSortKey: string, columnKey: string, dir: 'asc' | 'desc'): string {
  if (activeSortKey !== columnKey) return '';
  return dir === 'asc' ? '↑' : '↓';
}

/**
 * Cycle through sort states: asc → desc → none.
 * Returns the next [sortField, sortDir] pair.
 */
export function cycleSortState(
  currentField: string | null,
  currentDir: 'asc' | 'desc' | null,
  clickedField: string,
): { sortField: string | null; sortDir: 'asc' | 'desc' | null } {
  if (currentField !== clickedField) {
    return { sortField: clickedField, sortDir: 'asc' };
  }
  if (currentDir === 'asc') return { sortField: clickedField, sortDir: 'desc' };
  if (currentDir === 'desc') return { sortField: null, sortDir: null };
  return { sortField: clickedField, sortDir: 'asc' };
}

/** Same as sortArrowGlyph but shows `neutral` when the column is not the active sort key. */
export function sortArrowOrNeutral(
  activeSortKey: string,
  columnKey: string,
  dir: 'asc' | 'desc',
  neutral: string
): string {
  if (activeSortKey !== columnKey) return neutral;
  return dir === 'asc' ? '↑' : '↓';
}
