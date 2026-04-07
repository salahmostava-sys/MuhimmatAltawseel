import { logError } from '@shared/lib/logger';
import * as Sentry from '@sentry/react';

export class ServiceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.cause = cause;
  }
}

/** Wraps Supabase or unknown errors as {@link ServiceError} for consistent service-layer throws. */
export function toServiceError(error: unknown, context?: string): ServiceError {
  if (error instanceof ServiceError) return error;
  if (error) {
    logError('[serviceError] toServiceError', error);
    Sentry.captureException(error, { extra: { context } });
  }
  let message: string;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    const rawMessage = (error as { message: string }).message;
    if (rawMessage.includes("Edge Function returned a non-2xx status code")) {
      const ctx = (error as { context?: unknown }).context;
      if (ctx && typeof ctx === "object" && "error" in ctx && typeof (ctx as { error?: unknown }).error === "string") {
        message = (ctx as { error: string }).error;
      } else if (ctx && typeof ctx === "object" && "message" in ctx && typeof (ctx as { message?: unknown }).message === "string") {
        message = (ctx as { message: string }).message;
      } else {
        message = rawMessage;
      }
    } else {
      message = rawMessage;
    }
  } else if (context) {
    message = `Service failure: ${context}`;
  } else {
    message = "Service failure";
  }
  return new ServiceError(message, error);
}

export const throwIfError = (error: unknown, context: string): void => {
  if (!error) return;
  throw toServiceError(error, context);
};

/**
 * Central handler for Supabase client `error` (and other service-layer failures).
 * Use after `const { data, error } = await ...` (or `res.error`):
 * `if (error) handleSupabaseError(error, 'serviceName.action')`
 */
export function handleSupabaseError(error: unknown, context: string): never {
  throw toServiceError(error, context);
}

/**
 * Converts unknown runtime errors to user-facing message safely.
 * Use in UI catch blocks to avoid repetitive instanceof checks.
 */
export function getErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  if (error instanceof ServiceError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
