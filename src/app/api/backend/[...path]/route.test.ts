import { NextRequest } from 'next/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

const serverMock = {
  cookie: 'session=abc' as string | undefined,
  base: 'http://api.internal:4000/api/v1',
  requestId: 'req-1' as string | undefined,
};
vi.mock('@/lib/http/server', () => ({
  readForwardableCookieHeader: async () => serverMock.cookie,
  getServerApiBaseUrl: () => serverMock.base,
  readIncomingRequestId: async () => serverMock.requestId,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from './route';

const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });

describe('/api/backend/[...path]', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('forwards method, path, query, cookies, and request id, and relays the response', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"data":1}', {
          status: 201,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'session=new; Path=/; HttpOnly',
            'cache-control': 'public, max-age=60',
            'x-internal': 'secret',
          },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('https://app.example.com/api/backend/orders/42?expand=items', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer nope' },
      body: '{"qty":2}',
    });
    const res = await POST(request, ctx('orders', '42'));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.internal:4000/api/v1/orders/42?expand=items');
    expect(init.method).toBe('POST');
    const sent = new Headers(init.headers);
    expect(sent.get('cookie')).toBe('session=abc');
    expect(sent.get('x-request-id')).toBe('req-1');
    expect(sent.get('content-type')).toBe('application/json');
    expect(sent.get('authorization')).toBeNull();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: 1 });
    expect(res.headers.get('set-cookie')).toContain('session=new');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-internal')).toBeNull();
    expect(res.headers.get('x-request-id')).toBe('req-1');
  });

  it('answers 502 with a structured error when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const res = await GET(
      new NextRequest('https://app.example.com/api/backend/health'),
      ctx('health'),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'ERR_UPSTREAM', requestId: 'req-1' });
  });

  it('mints a request id when the proxy did not stamp one', async () => {
    serverMock.requestId = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const res = await GET(new NextRequest('https://app.example.com/api/backend/ping'), ctx('ping'));
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    serverMock.requestId = 'req-1';
  });
});
