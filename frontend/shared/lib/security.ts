/**
 * Escapes HTML special characters to prevent XSS when interpolating
 * user-controlled data into raw HTML strings (e.g. document.write / print windows).
 *
 * React JSX automatically escapes content, so this is only needed for
 * manual HTML template literals written to document.write() or similar APIs.
 */
export function escapeHtml(value: unknown): string {
  const str = (value === null || value === undefined) ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  return str
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/"/g, '&quot;')
    .replaceAll(/'/g, '&#39;');
}

/**
 * Sanitizes user input to prevent SQL injection in LIKE queries.
 * Escapes special characters: %, _, \
 */
export function sanitizeLikeQuery(input: string): string {
  if (!input) return '';
  return input
    .replaceAll(/\\/g, '\\\\')
    .replaceAll(/%/g, '\\%')
    .replaceAll(/_/g, '\\_');
}

/**
 * Validates UUID format (v4)
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
