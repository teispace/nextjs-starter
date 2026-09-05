import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

import { __resetRefreshManagersForTests } from '../client-utils';
import { AxiosClient } from './axios-client';
import * as axiosRefresh from './token-refresh';

// Force the server runtime for this file only.
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

/** See fetch-client/server-refresh.test.ts for the rationale. */
describe('axios client never refreshes tokens on the server', () => {
  beforeEach(() => {
    __resetRefreshManagersForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a 401 as-is and never calls refresh', async () => {
    const refreshSpy = vi.spyOn(axiosRefresh, 'refreshAuthToken');
    const client = new AxiosClient({ baseURL: BASE, tokenStore: makeTokenStore() });

    // Route every request through a stub adapter that answers 401 once.
    const axiosInstance = (client as unknown as { axios: import('axios').AxiosInstance }).axios;
    let calls = 0;
    axiosInstance.defaults.adapter = async (config) => {
      calls++;
      throw new (await import('axios')).AxiosError(
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
    };

    const result = await client.get('/auth/me');

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.status).toBe(401);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(calls).toBe(1);
  });
});
