import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { ApiException } from '@/lib/errors';
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

  it('skips undefined/null/empty so server-side defaults win', () => {
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

describe('AxiosClient cancellation & timeout mapping', () => {
  function makeClient() {
    return new AxiosClient({
      baseURL: 'https://api.example.com/api/v1',
      tokenStore: makeTokenStore(),
    });
  }

  /** Make the underlying axios instance's `get` reject with a given error. */
  function stubGetReject(client: AxiosClient, error: unknown) {
    const instance = (client as unknown as { axios: { get: unknown } }).axios;
    vi.spyOn(instance as { get: () => Promise<unknown> }, 'get').mockRejectedValue(error);
  }

  it('uses the shared default timeout when none is provided', () => {
    const client = makeClient();
    const defaults = getAxiosDefaults(client) as unknown as { timeout: number };
    expect(defaults.timeout).toBe(10_000);
  });

  it('respects an explicit timeout option (0 = disabled)', () => {
    const client = new AxiosClient({
      baseURL: 'https://api.example.com/api/v1',
      tokenStore: makeTokenStore(),
      timeout: 0,
    });
    const defaults = getAxiosDefaults(client) as unknown as { timeout: number };
    expect(defaults.timeout).toBe(0);
  });

  it('maps ERR_CANCELED to a cancelled ApiException', async () => {
    const client = makeClient();
    stubGetReject(client, new AxiosError('canceled', 'ERR_CANCELED'));

    const result = await client.get('/slow');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ApiException);
      expect(result.value.isCancelled()).toBe(true);
      expect(result.value.status).toBe(0);
    }
  });

  it('maps ECONNABORTED to a timeout ApiException', async () => {
    const client = makeClient();
    stubGetReject(client, new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'));

    const result = await client.get('/slow');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.isTimeout()).toBe(true);
      expect(result.value.status).toBe(0);
    }
  });

  it('maps a response-less error to a network ApiException', async () => {
    const client = makeClient();
    stubGetReject(client, new AxiosError('Network Error', 'ERR_NETWORK'));

    const result = await client.get('/users');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.isNetworkError()).toBe(true);
      expect(result.value.status).toBe(0);
    }
  });
});
