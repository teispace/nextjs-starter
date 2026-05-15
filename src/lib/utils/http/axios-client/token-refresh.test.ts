import type { AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

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

function makeAxiosStub(post: ReturnType<typeof vi.fn>): AxiosInstance {
  return { post } as unknown as AxiosInstance;
}

describe('axios refreshAuthToken', () => {
  beforeEach(() => {
    SAVE_AUTH_TOKENS.value = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to /auth/refresh (not /auth/refresh-token)', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
          sessionId: 'sess-1',
        },
      },
    });

    const result = await refreshAuthToken(makeTokenStore(), makeAxiosStub(post));

    expect(result).toBe('new-access');
    expect(post).toHaveBeenCalledWith(
      '/auth/refresh',
      {},
      expect.objectContaining({ _skipAuthInterceptor: true }),
    );
  });

  it('cookie mode: omits Authorization header even when refresh token is stored', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { data: { accessToken: 'a', refreshToken: 'r', expiresIn: 1, sessionId: 's' } },
    });

    await refreshAuthToken(
      makeTokenStore({ getRefreshToken: vi.fn().mockResolvedValue('stored-refresh') }),
      makeAxiosStub(post),
    );

    const config = post.mock.calls[0][2];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('bearer mode: sends Authorization: Bearer <refreshToken> and persists tokens', async () => {
    SAVE_AUTH_TOKENS.value = true;
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
          sessionId: 's',
        },
      },
    });

    const store = makeTokenStore({
      getRefreshToken: vi.fn().mockResolvedValue('stored-refresh'),
    });

    const result = await refreshAuthToken(store, makeAxiosStub(post));

    expect(result).toBe('new-access');
    const config = post.mock.calls[0][2];
    expect(config.headers.Authorization).toBe('Bearer stored-refresh');
    expect(store.saveAccessToken).toHaveBeenCalledWith('new-access');
    expect(store.saveRefreshToken).toHaveBeenCalledWith('new-refresh');
  });

  it('returns null on axios error', async () => {
    const post = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await refreshAuthToken(makeTokenStore(), makeAxiosStub(post));
    expect(result).toBeNull();
  });
});
