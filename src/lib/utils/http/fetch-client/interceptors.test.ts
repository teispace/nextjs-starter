import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenStore } from '@/types';

import { REQUEST_ID_HEADER, REQUEST_ID_PATTERN } from '../shared';

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

const { applyRequestInterceptors, applyResponseInterceptors } = await import('./interceptors');

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

describe('applyRequestInterceptors', () => {
  beforeEach(() => {
    SAVE_AUTH_TOKENS.value = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('generates a fresh X-Request-Id when none provided', async () => {
    const out = await applyRequestInterceptors({}, makeTokenStore(), {});
    const headers = out.headers as Record<string, string>;
    expect(headers[REQUEST_ID_HEADER]).toMatch(REQUEST_ID_PATTERN);
  });

  it('preserves a valid caller-supplied X-Request-Id', async () => {
    const out = await applyRequestInterceptors(
      { headers: { [REQUEST_ID_HEADER]: 'caller-supplied-id' } },
      makeTokenStore(),
      {},
    );
    const headers = out.headers as Record<string, string>;
    expect(headers[REQUEST_ID_HEADER]).toBe('caller-supplied-id');
  });

  it('replaces an invalid caller-supplied X-Request-Id', async () => {
    const out = await applyRequestInterceptors(
      { headers: { [REQUEST_ID_HEADER]: 'has spaces and !@#' } },
      makeTokenStore(),
      {},
    );
    const headers = out.headers as Record<string, string>;
    expect(headers[REQUEST_ID_HEADER]).not.toBe('has spaces and !@#');
    expect(headers[REQUEST_ID_HEADER]).toMatch(REQUEST_ID_PATTERN);
  });

  it('does not inject Cookie header when no resolver is wired (universal client)', async () => {
    const out = await applyRequestInterceptors({}, makeTokenStore(), {});
    const headers = out.headers as Record<string, string>;
    expect(headers.Cookie).toBeUndefined();
  });

  it('injects Cookie header from the resolver when one is wired (server client)', async () => {
    const resolver = vi.fn().mockResolvedValue('session=abc');
    const out = await applyRequestInterceptors({}, makeTokenStore(), {}, resolver);
    const headers = out.headers as Record<string, string>;
    expect(headers.Cookie).toBe('session=abc');
    expect(resolver).toHaveBeenCalledOnce();
  });

  it('omits Cookie when the resolver returns undefined', async () => {
    const resolver = vi.fn().mockResolvedValue(undefined);
    const out = await applyRequestInterceptors({}, makeTokenStore(), {}, resolver);
    const headers = out.headers as Record<string, string>;
    expect(headers.Cookie).toBeUndefined();
  });

  it('does not overwrite a caller-supplied Cookie header even with a resolver wired', async () => {
    const resolver = vi.fn().mockResolvedValue('injected=value');
    const out = await applyRequestInterceptors(
      { headers: { Cookie: 'caller=value' } },
      makeTokenStore(),
      {},
      resolver,
    );
    const headers = out.headers as Record<string, string>;
    expect(headers.Cookie).toBe('caller=value');
    expect(resolver).not.toHaveBeenCalled();
  });

  it('does not attach Authorization in cookie-mode (SAVE_AUTH_TOKENS=false)', async () => {
    const tokenStore = makeTokenStore({
      getAccessToken: vi.fn().mockResolvedValue('stored-token'),
    });
    const out = await applyRequestInterceptors({}, tokenStore, {});
    const headers = out.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(tokenStore.getAccessToken).not.toHaveBeenCalled();
  });

  it('attaches Authorization: Bearer <token> in bearer-mode (SAVE_AUTH_TOKENS=true)', async () => {
    SAVE_AUTH_TOKENS.value = true;
    const tokenStore = makeTokenStore({
      getAccessToken: vi.fn().mockResolvedValue('stored-token'),
    });
    const out = await applyRequestInterceptors({}, tokenStore, {});
    const headers = out.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer stored-token');
  });

  it('_skipAuthInterceptor bypasses all token logic', async () => {
    SAVE_AUTH_TOKENS.value = true;
    const tokenStore = makeTokenStore({
      getAccessToken: vi.fn().mockResolvedValue('stored-token'),
    });
    const out = await applyRequestInterceptors({ _skipAuthInterceptor: true }, tokenStore, {});
    const headers = out.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(tokenStore.getAccessToken).not.toHaveBeenCalled();
  });

  it('_authToken takes precedence over the stored access token', async () => {
    SAVE_AUTH_TOKENS.value = true;
    const tokenStore = makeTokenStore({
      getAccessToken: vi.fn().mockResolvedValue('stale-token'),
    });
    const out = await applyRequestInterceptors(
      { _authToken: 'fresh-token-from-retry' },
      tokenStore,
      {},
    );
    const headers = out.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer fresh-token-from-retry');
  });

  it('_authToken works even in cookie-mode (so retries after refresh still send the new token)', async () => {
    SAVE_AUTH_TOKENS.value = false;
    const out = await applyRequestInterceptors(
      { _authToken: 'token-from-refresh' },
      makeTokenStore(),
      {},
    );
    const headers = out.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-from-refresh');
  });
});

describe('applyResponseInterceptors', () => {
  it('does nothing on non-401 responses', async () => {
    const handleRefresh = vi.fn();
    const result = await applyResponseInterceptors(
      new Response('', { status: 200 }),
      null,
      {},
      makeTokenStore(),
      handleRefresh,
    );
    expect(result).toEqual({ shouldRetry: false, shouldReject: false });
    expect(handleRefresh).not.toHaveBeenCalled();
  });

  it('short-circuits on 401 when _retry is already true (no infinite loop)', async () => {
    const handleRefresh = vi.fn();
    const result = await applyResponseInterceptors(
      new Response('', { status: 401 }),
      null,
      { _retry: true },
      makeTokenStore(),
      handleRefresh,
    );
    expect(result).toEqual({ shouldRetry: false, shouldReject: false });
    expect(handleRefresh).not.toHaveBeenCalled();
  });

  it('short-circuits on 401 when _skipAuthInterceptor is set', async () => {
    const handleRefresh = vi.fn();
    const result = await applyResponseInterceptors(
      new Response('', { status: 401 }),
      null,
      { _skipAuthInterceptor: true },
      makeTokenStore(),
      handleRefresh,
    );
    expect(result).toEqual({ shouldRetry: false, shouldReject: false });
    expect(handleRefresh).not.toHaveBeenCalled();
  });

  it('on 401 + refresh success: returns shouldRetry with the new token', async () => {
    const handleRefresh = vi.fn().mockResolvedValue('new-token');
    const tokenStore = makeTokenStore();
    const result = await applyResponseInterceptors(
      new Response('', { status: 401 }),
      null,
      {},
      tokenStore,
      handleRefresh,
    );
    expect(result).toEqual({ shouldRetry: true, shouldReject: false, newToken: 'new-token' });
    expect(tokenStore.clear).not.toHaveBeenCalled();
  });

  it('on 401 + refresh failure: clears tokens, calls onUnauthorized, returns shouldReject', async () => {
    const handleRefresh = vi.fn().mockResolvedValue(null);
    const onUnauthorized = vi.fn();
    const tokenStore = makeTokenStore();
    const result = await applyResponseInterceptors(
      new Response('', { status: 401 }),
      null,
      {},
      tokenStore,
      handleRefresh,
      onUnauthorized,
    );
    expect(result).toEqual({ shouldRetry: false, shouldReject: true });
    expect(tokenStore.clear).toHaveBeenCalledOnce();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
