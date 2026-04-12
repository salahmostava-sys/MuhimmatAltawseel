import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
    ...overrides,
  } as unknown as Response;
}

describe('aiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('stays disabled when the backend URL is missing', async () => {
    vi.stubEnv('VITE_AI_BACKEND_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { aiService } = await import('./aiService');

    expect(aiService.isConfigured()).toBe(false);
    await expect(aiService.predictOrders([])).rejects.toThrow(
      'AI backend not configured (VITE_AI_BACKEND_URL is not set)',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts prediction requests to the configured backend', async () => {
    vi.stubEnv('VITE_AI_BACKEND_URL', 'https://ai.example');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          daily_forecast: [{ date: '2026-04-20', predicted_orders: 42 }],
          monthly_total_predicted: 420,
          trend: 'up',
          trend_percent: 12,
          confidence: 'high',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { aiService } = await import('./aiService');
    const history = [{ date: '2026-04-01', orders: 8, app_name: 'jahez' }];
    const result = await aiService.predictOrders(history, 14);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ai.example/predict-orders',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          forecast_days: 14,
        }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.monthly_total_predicted).toBe(420);
    expect(result.trend).toBe('up');
  });

  it('surfaces non-OK API responses with the backend message', async () => {
    vi.stubEnv('VITE_AI_BACKEND_URL', 'https://ai.example');
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(null, {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue('backend offline'),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { aiService } = await import('./aiService');

    await expect(aiService.bestDrivers([])).rejects.toThrow(
      'AI API error 503: backend offline',
    );
  });

  it('turns aborted requests into timeout errors', async () => {
    vi.stubEnv('VITE_AI_BACKEND_URL', 'https://ai.example');
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new DOMException('Request aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    const { aiService } = await import('./aiService');

    await expect(aiService.smartAlerts([])).rejects.toThrow(
      'AI API timeout after 20s: /smart-alerts',
    );
  });

  it('checks health with a GET request', async () => {
    vi.stubEnv('VITE_AI_BACKEND_URL', 'https://ai.example');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'ok', version: '1.2.3' }));
    vi.stubGlobal('fetch', fetchMock);

    const { aiService } = await import('./aiService');
    const result = await aiService.health();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ai.example/health',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual({ status: 'ok', version: '1.2.3' });
  });
});
