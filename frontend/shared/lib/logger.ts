import * as Sentry from '@sentry/react';
import { sanitizeForLog, sanitizeObjectForLog, sanitizeError } from './security/sanitize';

type LogLevel = 'error' | 'warn';
type LogMeta = {
  level: LogLevel;
  message: string;
  payload: unknown;
  ts: string;
  href: string;
  /** Vite mode: development | production */
  mode: string;
  /** Optional release label from VITE_APP_VERSION (CI/build). */
  release?: string;
};

const MONITORING_ENDPOINT = import.meta.env.VITE_MONITORING_ENDPOINT as string | undefined;
const APP_RELEASE = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || undefined;
let monitoringInstalled = false;

/**
 * Centralized error logger.
 * In production we avoid noisy console logs and forward events
 * to monitoring when VITE_MONITORING_ENDPOINT is configured.
 */
function emitLog(level: LogLevel, message: string, payload: unknown) {
  const safeMessage = sanitizeForLog(message);
  const safePayload = sanitizeObjectForLog(payload);
  
  if (level === 'error') {
    console.error(`[${level}] ${safeMessage}`, safePayload);
  } else {
    console.warn(`[${level}] ${safeMessage}`, safePayload);
  }
}

function sendToMonitoring(entry: LogMeta) {
  if (!MONITORING_ENDPOINT) return;
  try {
    const body = JSON.stringify(entry);
    const blob = new Blob([body], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(MONITORING_ENDPOINT, blob);
      return;
    }
    void fetch(MONITORING_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Never throw from logging.
  }
}

function track(level: LogLevel, message: string, error?: unknown, options?: { meta?: unknown }) {
  const safeMessage = sanitizeForLog(message);
  const sanitizedError = sanitizeError(error);
  const payload = options?.meta === undefined 
    ? sanitizedError 
    : { error: sanitizedError, meta: sanitizeObjectForLog(options.meta) };
  
  if (level === 'error') {
    Sentry.captureException(error || new Error(safeMessage), {
      extra: { message: safeMessage, payload, meta: options?.meta }
    });
  } else if (level === 'warn') {
    Sentry.captureMessage(safeMessage, {
      level: 'warning',
      extra: { payload, meta: options?.meta }
    });
  }

  sendToMonitoring({
    level,
    message: safeMessage,
    payload: sanitizeObjectForLog(payload),
    ts: new Date().toISOString(),
    href: typeof globalThis.location?.href === 'string' ? globalThis.location.href : '',
    mode: import.meta.env.MODE,
    ...(APP_RELEASE ? { release: APP_RELEASE } : {}),
  });
  
  if (!import.meta.env.PROD) {
    emitLog(level, safeMessage, payload);
  }
}

export const logger = {
  error: (message: string, error?: unknown, options?: { meta?: unknown }) => {
    track('error', message, error, options);
  },
  warn: (message: string, error?: unknown, options?: { meta?: unknown }) => {
    track('warn', message, error, options);
  },
};

/** Dev-friendly alias for `logger` that still forwards to monitoring in production (no extra console there). */
export function logError(message: string, error?: unknown, options?: { level?: LogLevel; meta?: unknown }) {
  const level: LogLevel = options?.level ?? 'error';
  if (level === 'warn') {
    logger.warn(message, error, { meta: options?.meta });
    return;
  }
  logger.error(message, error, { meta: options?.meta });
}

export function installGlobalErrorMonitoring() {
  if (monitoringInstalled) return;
  monitoringInstalled = true;

  globalThis.addEventListener('error', (event) => {
    const safeMessage = sanitizeForLog(event.error?.message ?? event.message);
    logger.error('[global] uncaught error', event.error ?? safeMessage, {
      meta: { 
        filename: sanitizeForLog(event.filename), 
        lineno: event.lineno, 
        colno: event.colno 
      },
    });
  });

  globalThis.addEventListener('unhandledrejection', (event) => {
    logger.error('[global] unhandled rejection', event.reason);
  });
}
