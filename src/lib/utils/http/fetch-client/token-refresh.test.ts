import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

import { REQUEST_ID_PATTERN } from '../shared';
import { refreshAuthToken } from './token-refresh';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const SAVE_AUTH_TOKENS = { value: false };
vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
  return {
    ...actual,
    get SAVE_AUTH_TOKENS() {
      return SAVE_AUTH_TOKENS.value;
    },
  };
});

function makeTokenStore(overrides: Partial<TokenStore> = {}): TokenStore {
  return {
    getAccessToken: vi.fn().mockResolvedValue(null),
    saveAccessToken: vi.fn().mockResolvedValue(undefined),
    getRefreshToken: vi.fn().mockResolvedValue(null),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('fetch refreshAuthToken', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    SAVE_AUTH_TOKENS.value = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('hits /auth/refresh (not /auth/refresh-token) and parses accessToken/refreshToken', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 900,
            sessionId: 'sess-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await refreshAuthToken(makeTokenStore(), 'https://api.example.com/api/v1');

    expect(result).toBe('new-access');
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://api.example.com/api/v1/auth/refresh');
  });

  it('sends an X-Request-Id header matching the expected pattern', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'a',
            refreshToken: 'r',
            expiresIn: 1,
            sessionId: 's',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await refreshAuthToken(makeTokenStore(), 'https://api.example.com/api/v1');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Request-Id']).toMatch(REQUEST_ID_PATTERN);
  });

  it('cookie mode: does NOT send Authorization header', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { accessToken: 'a', refreshToken: 'r', expiresIn: 1, sessionId: 's' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await refreshAuthToken(
      makeTokenStore({ getRefreshToken: vi.fn().mockResolvedValue('stored-refresh') }),
      'https://api.example.com/api/v1',
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('bearer mode: sends Authorization: Bearer <refreshToken> and persists new tokens', async () => {
    SAVE_AUTH_TOKENS.value = true;
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 900,
            sessionId: 's',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const store = makeTokenStore({
      getRefreshToken: vi.fn().mockResolvedValue('stored-refresh'),
    });

    const result = await refreshAuthToken(store, 'https://api.example.com/api/v1');

    expect(result).toBe('new-access');
    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer stored-refresh');
    expect(store.saveAccessToken).toHaveBeenCalledWith('new-access');
    expect(store.saveRefreshToken).toHaveBeenCalledWith('new-refresh');
  });

  it('returns null on non-ok response', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    const result = await refreshAuthToken(makeTokenStore(), 'https://api.example.com/api/v1');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await refreshAuthToken(makeTokenStore(), 'https://api.example.com/api/v1');
    expect(result).toBeNull();
  });
});
