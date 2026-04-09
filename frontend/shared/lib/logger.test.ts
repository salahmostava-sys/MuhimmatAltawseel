import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@sentry/react', () => sentryMocks);

describe('logger monitoring smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    sentryMocks.captureException.mockClear();
    sentryMocks.captureMessage.mockClear();
  });

  it('captures errors without noisy console logging', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { logger } = await import('./logger');

    logger.error('test error', new Error('boom'));

    expect(sentryMocks.captureException).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('installs global handlers once', async () => {
    const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');
    const { installGlobalErrorMonitoring } = await import('./logger');

    installGlobalErrorMonitoring();
    installGlobalErrorMonitoring();

    const registeredHandlers = addEventListenerSpy.mock.calls.map((call) =>
      String(call[0] ?? ''),
    );

    expect(registeredHandlers.filter((name) => name === 'error')).toHaveLength(1);
    expect(registeredHandlers.filter((name) => name === 'unhandledrejection')).toHaveLength(1);
  });
});
