/**
 * Shared test utilities for hooks that depend on React Query.
 *
 * Eliminates boilerplate duplication across authed-query test files.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Creates a QueryClient + QueryClientProvider wrapper for `renderHook`.
 * Each call creates a fresh QueryClient (no stale cache between tests).
 */
export function createQueryClientWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
