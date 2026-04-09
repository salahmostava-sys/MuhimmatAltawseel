import { describe, expect, it } from 'vitest';
import { escapeHtml } from './security';

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml(`<a href="x">y</a> & ' "`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;y&lt;/a&gt; &amp; &#39; &quot;'
    );
  });

  it('handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('stringifies numbers', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  it('escapes < > & " characters individually', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('preserves safe text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles Arabic text safely', () => {
    expect(escapeHtml('مرحبا بالعالم')).toBe('مرحبا بالعالم');
  });
});
