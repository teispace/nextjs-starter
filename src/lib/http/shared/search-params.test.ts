import { describe, expect, it } from 'vitest';

import { toSearchParams } from './search-params';

describe('toSearchParams', () => {
  it('serialises a typed query object to URLSearchParams', () => {
    const params = toSearchParams({ page: 2, size: 20, sort: 'createdAt', order: 'desc' });
    expect(params.toString()).toBe('page=2&size=20&sort=createdAt&order=desc');
  });

  it('skips undefined, null, and empty strings (lets server-side defaults win)', () => {
    const params = toSearchParams({
      page: 1,
      size: undefined,
      search: '',
      sort: null as unknown as string,
    });
    expect(params.toString()).toBe('page=1');
  });

  it('repeats keys for array values', () => {
    const params = toSearchParams({ tag: ['a', 'b', 'c'] });
    expect(params.toString()).toBe('tag=a&tag=b&tag=c');
  });

  it('skips empty array items', () => {
    const params = toSearchParams({ tag: ['a', '', null, 'b'] as Array<string | null> });
    expect(params.toString()).toBe('tag=a&tag=b');
  });

  it('stringifies booleans and numbers', () => {
    const params = toSearchParams({ active: true, count: 0 });
    expect(params.toString()).toBe('active=true&count=0');
  });
});
