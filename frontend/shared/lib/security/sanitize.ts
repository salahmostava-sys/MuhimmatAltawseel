/**
 * Security utilities for sanitizing user input before logging or displaying
 * Prevents log injection, XSS, and other injection attacks
 */

/**
 * Sanitizes a string to prevent log injection attacks (CWE-117)
 * Removes newlines, carriage returns, and control characters
 */
export function sanitizeForLog(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  const str = String(input);
  
  // Remove newlines, carriage returns, and other control characters
  return str
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 1000); // Limit length to prevent log flooding
}

/**
 * Sanitizes an object for logging by sanitizing all string values
 */
export function sanitizeObjectForLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeForLog(obj);
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectForLog);
  }
  
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeForLog(key)] = sanitizeObjectForLog(value);
  }
  
  return sanitized;
}

/**
 * Sanitizes HTML to prevent XSS attacks (CWE-79, CWE-80)
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
 * Masks sensitive data in strings (passwords, tokens, etc.)
 */
export function maskSensitiveData(input: string): string {
  return input
    .replace(/password["\s:=]+[^\s&"]+/gi, 'password=***')
    .replace(/token["\s:=]+[^\s&"]+/gi, 'token=***')
    .replace(/api[_-]?key["\s:=]+[^\s&"]+/gi, 'api_key=***')
    .replace(/secret["\s:=]+[^\s&"]+/gi, 'secret=***')
    .replace(/bearer\s+[^\s]+/gi, 'bearer ***');
}

/**
 * Sanitizes error messages before logging
 */
export function sanitizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: sanitizeForLog(error.message),
      stack: error.stack ? sanitizeForLog(error.stack) : undefined,
    };
  }
  
  return {
    message: sanitizeForLog(String(error)),
  };
}
