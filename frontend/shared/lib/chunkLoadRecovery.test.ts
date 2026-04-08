import { describe, expect, it } from 'vitest';

import { isLikelyStaleChunkError, isLikelyStaleChunkReason } from './chunkLoadRecovery';

describe('chunkLoadRecovery', () => {
  it('detects classic stale chunk load failures', () => {
    expect(
      isLikelyStaleChunkError('TypeError: Failed to fetch dynamically imported module'),
    ).toBe(true);
    expect(
      isLikelyStaleChunkReason(new Error('Loading chunk 7 failed.')),
    ).toBe(true);
  });

  it('detects lazy-module mismatch errors that surface as React #306', () => {
    expect(
      isLikelyStaleChunkError(
        'Minified React error #306; visit https://reactjs.org/docs/error-decoder.html?invariant=306&args[]=undefined',
      ),
    ).toBe(true);
    expect(
      isLikelyStaleChunkReason(
        new Error(
          'lazy: Expected the result of a dynamic import() call. Instead received: undefined',
        ),
      ),
    ).toBe(true);
  });

  it('ignores unrelated runtime errors', () => {
    expect(isLikelyStaleChunkError('Network request failed')).toBe(false);
    expect(isLikelyStaleChunkReason(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
