/**
 * SessionManager — Centralized inactivity engine.
 *
 * Responsibilities:
 *  1. Track user activity via DOM events (throttled).
 *  2. Run an inactivity countdown timer.
 *  3. Fire a warning callback N seconds before timeout.
 *  4. Fire a timeout callback when the user has been idle too long.
 *  5. Synchronise activity and logout across browser tabs via BroadcastChannel.
 *
 * This class is framework-agnostic — the React hook (`useSessionManager`)
 * wires it into React lifecycle and AuthContext.
 */

import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_BEFORE_MS,
  SESSION_BROADCAST_CHANNEL,
  SESSION_ACTIVITY_EVENTS,
  SESSION_ACTIVITY_THROTTLE_MS,
} from './sessionConstants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionManagerConfig {
  /** Total inactivity duration before auto-logout (ms). */
  inactivityTimeoutMs?: number;
  /** Warning fires this many ms before the timeout. */
  warningBeforeMs?: number;
  /** Called once when the warning threshold is crossed. */
  onWarning: () => void;
  /** Called once when the full timeout elapses — trigger logout here. */
  onTimeout: () => void;
  /** Called when another tab reports activity (optional). */
  onActivityFromOtherTab?: () => void;
}

type BroadcastPayload =
  | { type: 'SESSION_ACTIVITY' }
  | { type: 'SESSION_LOGOUT' };

// ─── Class ───────────────────────────────────────────────────────────────────

export class SessionManager {
  private readonly timeoutMs: number;
  private readonly warningMs: number;
  private readonly onWarning: () => void;
  private readonly onTimeout: () => void;
  private readonly onActivityFromOtherTab: (() => void) | undefined;

  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTs = 0;
  private warningSent = false;
  private running = false;

  private channel: BroadcastChannel | null = null;
  private boundOnActivity: (() => void) | null = null;
  private boundOnBroadcast: ((ev: MessageEvent<BroadcastPayload>) => void) | null = null;

  constructor(config: SessionManagerConfig) {
    this.timeoutMs = config.inactivityTimeoutMs ?? SESSION_INACTIVITY_TIMEOUT_MS;
    this.warningMs = config.warningBeforeMs ?? SESSION_WARNING_BEFORE_MS;
    this.onWarning = config.onWarning;
    this.onTimeout = config.onTimeout;
    this.onActivityFromOtherTab = config.onActivityFromOtherTab;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Start tracking activity and counting down. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastActivityTs = Date.now();
    this.warningSent = false;

    // DOM activity listeners (throttled)
    this.boundOnActivity = this.createThrottledHandler();
    for (const event of SESSION_ACTIVITY_EVENTS) {
      document.addEventListener(event, this.boundOnActivity, { passive: true, capture: true });
    }

    // BroadcastChannel for cross-tab sync
    try {
      this.channel = new BroadcastChannel(SESSION_BROADCAST_CHANNEL);
      this.boundOnBroadcast = this.handleBroadcast.bind(this);
      this.channel.addEventListener('message', this.boundOnBroadcast);
    } catch {
      // BroadcastChannel not supported (e.g. some WebView) — degrade gracefully
      this.channel = null;
    }

    this.scheduleTimers();
  }

  /** Stop all tracking and timers (but keep the instance reusable). */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.clearTimers();
    this.removeListeners();
  }

  /** Reset the inactivity countdown (e.g. after external activity signal). */
  resetTimer(): void {
    if (!this.running) return;
    this.lastActivityTs = Date.now();
    this.warningSent = false;
    this.clearTimers();
    this.scheduleTimers();
  }

  /** Full teardown — call on unmount. */
  destroy(): void {
    this.stop();
    if (this.channel) {
      try { this.channel.close(); } catch { /* ignore */ }
      this.channel = null;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  get remainingMs(): number {
    if (!this.running) return 0;
    const elapsed = Date.now() - this.lastActivityTs;
    return Math.max(0, this.timeoutMs - elapsed);
  }

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  /** Notify other tabs that the user is active here. */
  private broadcastActivity(): void {
    try {
      this.channel?.postMessage({ type: 'SESSION_ACTIVITY' } satisfies BroadcastPayload);
    } catch { /* channel may be closed */ }
  }

  /** Notify other tabs that logout happened here. */
  broadcastLogout(): void {
    try {
      this.channel?.postMessage({ type: 'SESSION_LOGOUT' } satisfies BroadcastPayload);
    } catch { /* channel may be closed */ }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private createThrottledHandler(): () => void {
    let lastCall = 0;
    return () => {
      const now = Date.now();
      if (now - lastCall < SESSION_ACTIVITY_THROTTLE_MS) return;
      lastCall = now;
      this.onLocalActivity();
    };
  }

  private onLocalActivity(): void {
    this.lastActivityTs = Date.now();
    this.warningSent = false;
    this.clearTimers();
    this.scheduleTimers();
    this.broadcastActivity();
  }

  private scheduleTimers(): void {
    // Warning timer
    const warningDelay = this.timeoutMs - this.warningMs;
    if (warningDelay > 0) {
      this.warningTimer = setTimeout(() => {
        if (!this.warningSent) {
          this.warningSent = true;
          this.onWarning();
        }
      }, warningDelay);
    }

    // Timeout timer
    this.timeoutTimer = setTimeout(() => {
      this.running = false;
      this.removeListeners();
      this.broadcastLogout();
      this.onTimeout();
    }, this.timeoutMs);
  }

  private clearTimers(): void {
    if (this.warningTimer !== null) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private removeListeners(): void {
    if (this.boundOnActivity) {
      for (const event of SESSION_ACTIVITY_EVENTS) {
        document.removeEventListener(event, this.boundOnActivity, { capture: true });
      }
      this.boundOnActivity = null;
    }
    if (this.boundOnBroadcast && this.channel) {
      this.channel.removeEventListener('message', this.boundOnBroadcast);
      this.boundOnBroadcast = null;
    }
  }

  private handleBroadcast(ev: MessageEvent<BroadcastPayload>): void {
    const data = ev.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'SESSION_ACTIVITY':
        // Another tab had activity → reset our local timer too
        this.lastActivityTs = Date.now();
        this.warningSent = false;
        this.clearTimers();
        this.scheduleTimers();
        this.onActivityFromOtherTab?.();
        break;

      case 'SESSION_LOGOUT':
        // Another tab logged out → mirror the logout here
        this.running = false;
        this.clearTimers();
        this.removeListeners();
        this.onTimeout();
        break;
    }
  }
}
