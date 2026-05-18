import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiException } from '@/lib/errors';
import type { TokenStore } from '@/types';

import { FetchClient } from './fetch-client';
import * as tokenRefreshModule from './token-refresh';

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

function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

const BASE = 'https://api.example.com/api/v1';

describe('FetchClient params option', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: FetchClient;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    client = new FetchClient({ baseURL: BASE, tokenStore: makeTokenStore() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serialises params onto the URL', async () => {
    await client.get('/users', { params: { page: 2, size: 20 } });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users?page=2&size=20`);
  });

  it('skips undefined/null/empty values so server-side defaults win', async () => {
    await client.get('/users', {
      params: { page: 1, size: undefined, search: '', sort: null as unknown as string },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users?page=1`);
  });

  it('repeats keys for array values', async () => {
    await client.get('/users', { params: { tag: ['a', 'b'] } });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users?tag=a&tag=b`);
  });

  it('uses & when the URL already has a query string', async () => {
    await client.get('/users?role=admin', { params: { page: 2 } });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users?role=admin&page=2`);
  });

  it('omits ? entirely when all params serialise to empty', async () => {
    await client.get('/users', { params: { page: undefined, search: '' } });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users`);
  });

  it('does not forward params as a fetch RequestInit field', async () => {
    await client.get('/users', { params: { page: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as Record<string, unknown>).params).toBeUndefined();
  });
});

describe('FetchClient response unwrapping (dataKey)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: FetchClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new FetchClient({ baseURL: BASE, tokenStore: makeTokenStore() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('default dataKey="data" unwraps the envelope data field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 200, data: { id: '42' }, timestamp: 'x' }));
    const result = await client.get<{ id: string }>('/users/42');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toEqual({ id: '42' });
  });

  it('dataKey=null returns the whole envelope', async () => {
    const envelope = { status: 200, data: { id: '42' }, timestamp: 'x' };
    fetchMock.mockResolvedValue(jsonResponse(envelope));
    const result = await client.get('/users/42', undefined, null);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toEqual(envelope);
  });

  it('custom dataKey unwraps the named field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [1, 2, 3] }));
    const result = await client.get<number[]>('/users', undefined, 'items');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toEqual([1, 2, 3]);
  });
});

describe('FetchClient error handling', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: FetchClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new FetchClient({ baseURL: BASE, tokenStore: makeTokenStore() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns a left ApiException carrying status / message / code / requestId', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          status: 422,
          path: '/api/v1/users',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: [{ email: 'Invalid format' }],
          requestId: 'req-abc',
        },
        422,
      ),
    );

    const result = await client.post('/users', { email: 'bad' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      const err = result.value;
      expect(err).toBeInstanceOf(ApiException);
      expect(err.status).toBe(422);
      expect(err.message).toBe('Validation failed');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.requestId).toBe('req-abc');
      expect(err.getErrorMessage('email')).toBe('Invalid format');
    }
  });

  it('falls back to the X-Request-Id header when the body has no requestId', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 500, message: 'Boom' }, 500, { 'X-Request-Id': 'req-from-header' }),
    );

    const result = await client.get('/users');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.requestId).toBe('req-from-header');
  });

  it('converts a network failure into an ApiException with status 0', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await client.get('/users');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.status).toBe(0);
      expect(result.value.message).toBe('ECONNREFUSED');
    }
  });
});

describe('FetchClient 401 → refresh → retry lifecycle', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let refreshSpy: ReturnType<typeof vi.spyOn>;
  let onUnauthorized: () => void;
  let tokenStore: TokenStore;
  let client: FetchClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    refreshSpy = vi.spyOn(tokenRefreshModule, 'refreshAuthToken');
    onUnauthorized = vi.fn<() => void>();
    tokenStore = makeTokenStore();
    client = new FetchClient({ baseURL: BASE, tokenStore, onUnauthorized });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries the original request with the fresh token on 401 → refresh success', async () => {
    refreshSpy.mockResolvedValue('new-access-token');

    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    const result = await client.get<{ ok: boolean }>('/me');

    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call must carry the new token in the Authorization header.
    const [, retryInit] = fetchMock.mock.calls[1];
    const retryHeaders = (retryInit as RequestInit).headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer new-access-token');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toEqual({ ok: true });
  });

  it('clears the token store, calls onUnauthorized, and returns left when refresh fails', async () => {
    refreshSpy.mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonResponse({ status: 401, message: 'Unauthorized' }, 401));

    const result = await client.get('/me');

    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(tokenStore.clear).toHaveBeenCalledOnce();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.status).toBe(401);
  });

  it('does not attempt refresh when _skipAuthInterceptor is set', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));

    const result = await client.get('/public', { _skipAuthInterceptor: true });

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(result.isLeft()).toBe(true);
  });
});

describe('FetchClient URL composition', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: FetchClient;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: null }));
    vi.stubGlobal('fetch', fetchMock);
    client = new FetchClient({ baseURL: BASE, tokenStore: makeTokenStore() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('passes through absolute URLs unchanged (no baseURL prefix)', async () => {
    await client.get('https://other.example.com/raw');
    expect(fetchMock.mock.calls[0][0]).toBe('https://other.example.com/raw');
  });

  it('normalises double-slashes between base and path', async () => {
    await client.get('/users');
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/users`);

    await client.get('users');
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/users`);
  });
});
