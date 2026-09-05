import { afterEach, describe, expect, it, vi } from 'vitest';

const serverMock = {
  cookie: 'session=abc' as string | undefined,
  base: 'http://api.internal:4000/api/v1',
};
vi.mock('@/lib/http/server', () => ({
  readForwardableCookieHeader: async () => serverMock.cookie,
  getServerApiBaseUrl: () => serverMock.base,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from './route';

describe('POST /api/auth/refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    serverMock.cookie = 'session=abc';
  });

  it('rejects when the browser sent no session cookies', async () => {
    serverMock.cookie = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards cookies upstream and relays every Set-Cookie on success', async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append('set-cookie', 'access=new; Path=/; HttpOnly');
    upstreamHeaders.append('set-cookie', 'refresh=new2; Path=/; HttpOnly');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200, headers: upstreamHeaders }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST();

    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie()).toEqual([
      'access=new; Path=/; HttpOnly',
      'refresh=new2; Path=/; HttpOnly',
    ]);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.internal:4000/api/v1/auth/refresh');
    expect((init.headers as Record<string, string>).cookie).toBe('session=abc');
    expect((init.headers as Record<string, string>)['X-Request-Id']).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('maps an upstream rejection to 401 and an upstream outage to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await POST()).status).toBe(401);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect((await POST()).status).toBe(502);
  });
});
