/**
 * Session management constants.
 *
 * All timeouts are in milliseconds.
 * Change these values to adjust inactivity behaviour across the app.
 */

/** How long the user can be idle before auto-logout (default: 10 minutes). */
export const SESSION_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

/** Warning toast fires this many ms before the timeout (default: 1 minute). */
export const SESSION_WARNING_BEFORE_MS = 60 * 1000;

/** BroadcastChannel name shared across all tabs of this app. */
export const SESSION_BROADCAST_CHANNEL = 'muhimmat-session';

/** DOM events that count as "user activity". */
export const SESSION_ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
] as const;

/** Throttle duration for activity events (avoids firing on every pixel). */
export const SESSION_ACTIVITY_THROTTLE_MS = 5_000;
