import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

import { __resetRefreshManagersForTests } from '../client-utils';
import { FetchClient } from './fetch-client';
import * as fetchRefresh from './token-refresh';

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

/**
 * Regression guard for the cross-user refresh leak: the refresh singleflight is
 * process-wide and keyed only by baseURL, so a server-side refresh would be
 * shared by every concurrent request. On the server a 401 must surface as a
 * value with no refresh attempt, no retry, and no unauthorized callback.
 *
 * Lives next to the client it covers so the axios and fetch variants can be
 * removed independently by next-maker.
 */
describe('fetch client never refreshes tokens on the server', () => {
  beforeEach(() => {
    __resetRefreshManagersForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns a 401 as-is and never calls refresh', async () => {
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
  });
});
