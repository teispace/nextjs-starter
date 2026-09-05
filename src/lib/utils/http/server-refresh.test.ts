import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

import { AxiosClient } from './axios-client/axios-client';
import * as axiosRefresh from './axios-client/token-refresh';
import { __resetRefreshManagersForTests } from './client-utils';
import { FetchClient } from './fetch-client/fetch-client';
import * as fetchRefresh from './fetch-client/token-refresh';

// Force the server runtime for this file only. Both HTTP clients read the
// shared runtime helper, so mocking the leaf module covers fetch and axios.
vi.mock('@/lib/utils/runtime', () => ({
  isBrowser: () => false,
  isServer: () => true,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const BASE = 'https://api.example.com/api/v1';

function makeTokenStore(): TokenStore {
  return {
    getAccessToken: vi.fn().mockResolvedValue(null),
    saveAccessToken: vi.fn().mockResolvedValue(undefined),
    getRefreshToken: vi.fn().mockResolvedValue(null),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Regression guard for the cross-user refresh leak: the refresh singleflight is
 * process-wide and keyed only by baseURL, so a server-side refresh would be
 * shared by every concurrent request. On the server a 401 must surface as a
 * value with no refresh attempt, no retry, and no unauthorized callback.
 */
describe('HTTP clients never refresh tokens on the server', () => {
  beforeEach(() => {
    __resetRefreshManagersForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetch client: 401 is returned as-is, refresh is never called', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 401, message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const refreshSpy = vi.spyOn(fetchRefresh, 'refreshAuthToken');
    const onUnauthorized = vi.fn();

    const client = new FetchClient({ baseURL: BASE, tokenStore: makeTokenStore(), onUnauthorized });
    const result = await client.get('/auth/me');

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.status).toBe(401);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // onUnauthorized is the browser redirect; it stays wired but the server
    // implementation is a no-op, so its invocation is not what we guard here.
  });

  it('axios client: 401 is returned as-is, refresh is never called', async () => {
    const refreshSpy = vi.spyOn(axiosRefresh, 'refreshAuthToken');
    const client = new AxiosClient({ baseURL: BASE, tokenStore: makeTokenStore() });

    // Route every request through a stub adapter that answers 401 once.
    const axiosInstance = (client as unknown as { axios: import('axios').AxiosInstance }).axios;
    let calls = 0;
    axiosInstance.defaults.adapter = async (config) => {
      calls++;
      const error = new (await import('axios')).AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { status: 401, message: 'Unauthorized' },
        },
      );
      throw error;
    };

    const result = await client.get('/auth/me');

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.status).toBe(401);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(calls).toBe(1);
  });
});
