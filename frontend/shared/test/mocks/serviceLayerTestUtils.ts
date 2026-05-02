import { type MockQueryResult } from './supabaseClientMock';

export function resetMockTableResults(tableResults: Record<string, MockQueryResult>) {
  for (const key of Object.keys(tableResults)) delete tableResults[key];
}

export function formatServiceError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : 'service error';
  return new Error(`${context}: ${message}`);
}

export function throwFormattedServiceError(error: unknown, context: string): never {
  throw formatServiceError(error, context);
}
