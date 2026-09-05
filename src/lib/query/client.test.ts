import { describe, expect, it } from 'vitest';

import { HttpError } from '@/lib/errors';
import { fail, ok } from '@/types';

import { makeQueryClient } from './client';
import { unwrapForQuery } from './unwrap';

const retryOf = (client: ReturnType<typeof makeQueryClient>) => {
  const retry = client.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('expected a retry function');
  return retry;
};

describe('makeQueryClient', () => {
  it('retries network failures once and never HTTP failures', () => {
    const retry = retryOf(makeQueryClient());
    expect(retry(0, HttpError.network('offline'))).toBe(true);
    expect(retry(1, HttpError.network('offline'))).toBe(false);
    expect(retry(0, new HttpError({ message: 'nope', status: 500 }))).toBe(false);
    expect(retry(0, new HttpError({ message: 'nope', status: 404 }))).toBe(false);
  });

  it('dehydrates pending queries so the server can stream them', () => {
    const client = makeQueryClient();
    const should = client.getDefaultOptions().dehydrate?.shouldDehydrateQuery;
    if (!should) throw new Error('expected a dehydrate predicate');
    void client.query({
      queryKey: ['pending'],
      queryFn: () => new Promise<never>(() => undefined),
    });
    const query = client.getQueryCache().find({ queryKey: ['pending'] });
    if (!query) throw new Error('query not registered');
    expect(should(query)).toBe(true);
  });
});

describe('prefetchQuery', () => {
  it('swallows failures so the client owns the error state', async () => {
    const { prefetchQuery } = await import('./prefetch');
    await expect(
      prefetchQuery({ queryKey: ['boom'], queryFn: () => Promise.reject(new Error('boom')) }),
    ).resolves.toBeUndefined();
  });
});

describe('unwrapForQuery', () => {
  it('returns data on success and throws the error on failure', () => {
    expect(unwrapForQuery(ok(1))).toBe(1);
    const error = new HttpError({ message: 'boom', status: 500 });
    expect(() => unwrapForQuery(fail(error))).toThrow(error);
  });
});
