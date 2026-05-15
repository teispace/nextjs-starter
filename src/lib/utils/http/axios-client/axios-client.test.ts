import { describe, expect, it } from 'vitest';

import type { TokenStore } from '@/types';

import { AxiosClient } from './axios-client';

function makeTokenStore(): TokenStore {
  return {
    getAccessToken: () => Promise.resolve(null),
    saveAccessToken: () => Promise.resolve(),
    getRefreshToken: () => Promise.resolve(null),
    saveRefreshToken: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  };
}

/**
 * Pull the underlying axios instance off `AxiosClient` (which keeps it
 * `private`) so we can introspect its config without making real HTTP calls.
 * The point of these tests is to regression-guard the `paramsSerializer`
 * override; pulling it off the instance is the most direct way.
 */
function getAxiosDefaults(client: AxiosClient) {
  return (client as unknown as { axios: { defaults: { paramsSerializer: unknown } } }).axios
    .defaults;
}

describe('AxiosClient paramsSerializer (shared serialiser regression guard)', () => {
  const client = new AxiosClient({
    baseURL: 'https://api.example.com/api/v1',
    tokenStore: makeTokenStore(),
  });

  function serialise(params: Record<string, unknown>): string {
    const defaults = getAxiosDefaults(client);
    const fn = defaults.paramsSerializer as (params: Record<string, unknown>) => string;
    return fn(params);
  }

  it('produces the same output shape as the fetch client', () => {
    expect(serialise({ page: 2, size: 20 })).toBe('page=2&size=20');
  });

  it('skips undefined/null/empty so backend defaults win', () => {
    expect(serialise({ page: 1, size: undefined, search: '', sort: null })).toBe('page=1');
  });

  it('repeats keys for array values', () => {
    expect(serialise({ tag: ['a', 'b', 'c'] })).toBe('tag=a&tag=b&tag=c');
  });

  it('coerces booleans and numbers', () => {
    expect(serialise({ active: true, count: 0 })).toBe('active=true&count=0');
  });

  it('returns an empty string when every param is skipped', () => {
    expect(serialise({ page: undefined, search: '' })).toBe('');
  });
});
