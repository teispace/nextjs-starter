import { describe, expect, it } from 'vitest';

import { mergeHeaders, toHeaders } from './headers';

describe('headers', () => {
  it('normalises every HeadersInit shape to a Headers instance', () => {
    expect(toHeaders({ 'X-A': '1' }).get('x-a')).toBe('1');
    expect(toHeaders([['X-B', '2']]).get('x-b')).toBe('2');
    expect(toHeaders(new Headers({ 'X-C': '3' })).get('x-c')).toBe('3');
    expect(toHeaders(undefined).has('anything')).toBe(false);
  });

  it('merges case-insensitively with later sources winning', () => {
    const merged = mergeHeaders(
      { 'Content-Type': 'a', 'X-Keep': 'k' },
      new Headers({ 'content-type': 'b' }),
      undefined,
    );
    expect(merged.get('content-type')).toBe('b');
    expect(merged.get('x-keep')).toBe('k');
  });
});
