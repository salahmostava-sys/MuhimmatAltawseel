/**
 * Security utilities for sanitizing user input before logging or displaying.
 * Prevents log injection (CWE-117), XSS (CWE-79), and accidental credential leakage.
 */

/**
 * Sensitive object key patterns whose values should be masked in logs.
 * Matches keys like: password, token, api_key, secret, apiKey, accessToken, etc.
 */
const SENSITIVE_KEY_PATTERN =
  /^(password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|auth|authorization|credential|private[_-]?key|session[_-]?id)$/i;

/**
 * Removes control characters (newlines, CRs, tabs, and non-printable chars)
 * from a string to prevent log injection attacks (CWE-117).
 */
function stripControlCharacters(input: string): string {
  return Array.from(input)
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined) return false;
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('');
}

/**
 * Sanitizes a string value for safe logging.
 * - Strips control characters (log injection prevention)
 * - Applies sensitive data masking (credential leakage prevention)
 * - Truncates to 1000 chars (log flooding prevention)
 */
export function sanitizeForLog(input: unknown): string {
  if (input === null || input === undefined) return '';

  const str = String(input);
  const stripped = stripControlCharacters(str.replace(/[\r\n\t]/g, ' '));
  return maskSensitiveData(stripped).trim().slice(0, 1000);
}

/**
 * Recursively sanitizes an object for logging.
 * - Masks values of known sensitive keys (password, token, secret, etc.)
 * - Sanitizes all string values
 * - Handles arrays, primitives, and nested objects
 */
export function sanitizeObjectForLog(obj: unknown, _depth = 0): unknown {
  // Avoid infinite recursion on deeply nested / circular structures
  if (_depth > 8) return '[max depth]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') return sanitizeForLog(obj);

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.slice(0, 50).map((item) => sanitizeObjectForLog(item, _depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = sanitizeForLog(key);
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[safeKey] = '***';
    } else {
      sanitized[safeKey] = sanitizeObjectForLog(value, _depth + 1);
    }
  }
  return sanitized;
}

/**
 * Sanitizes HTML to prevent XSS attacks (CWE-79, CWE-80).
 * Use this when injecting user content into raw HTML strings
 * (React JSX already escapes content automatically).
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Masks sensitive patterns in a string value.
 * Handles common credential formats: passwords, tokens, API keys, bearer tokens.
 */
export function maskSensitiveData(input: string): string {
  return input
    .replace(/password["\s:=]+[^\s&"]+/gi, 'password=***')
    .replace(/passwd["\s:=]+[^\s&"]+/gi, 'passwd=***')
    .replace(/token["\s:=]+[^\s&"]+/gi, 'token=***')
    .replace(/api[_-]?key["\s:=]+[^\s&"]+/gi, 'api_key=***')
    .replace(/secret["\s:=]+[^\s&"]+/gi, 'secret=***')
    .replace(/bearer\s+[^\s]+/gi, 'bearer ***')
    .replace(/authorization["\s:=]+[^\s&"]+/gi, 'authorization=***');
}

/**
 * Sanitizes error objects before logging.
 * Extracts message and optional stack trace, both sanitized.
 */
export function sanitizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: sanitizeForLog(error.message),
      stack: error.stack ? sanitizeForLog(error.stack) : undefined,
    };
  }
  return { message: sanitizeForLog(String(error)) };
}
