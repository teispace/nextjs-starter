import { HttpResponse, http as mswHttp } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './client';

// Force the server runtime for this file: both entries read the shared helper.
vi.mock('@/lib/runtime', () => ({ isBrowser: () => false, isServer: () => true }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const BASE = 'https://api.example.test/api/v1';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Regression guard for the cross-user refresh leak: refresh state is
 * process-wide on the server, so a 401 must come back as a value with no
 * refresh, no replay, and no unauthorized callback.
 */
describe('HttpClient on the server', () => {
  it('returns a 401 as a value and never refreshes, even when a refresh policy is configured', async () => {
    let calls = 0;
    server.use(
      mswHttp.get(`${BASE}/private`, () => {
        calls++;
        return HttpResponse.json({ message: 'Expired' }, { status: 401 });
      }),
    );
    const refresh = vi.fn().mockResolvedValue(true);
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseURL: BASE,
      retry: false,
      auth: { refresh, onUnauthorized },
    });

    const result = await client.get('/private');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(calls).toBe(1);
  });

  it('forwards cookies and propagates the incoming request id', async () => {
    let cookie = '';
    let requestId = '';
    server.use(
      mswHttp.get(`${BASE}/me`, ({ request }) => {
        cookie = request.headers.get('cookie') ?? '';
        requestId = request.headers.get('x-request-id') ?? '';
        return HttpResponse.json({ data: { id: 1 } });
      }),
    );
    const client = createHttpClient({
      baseURL: BASE,
      retry: false,
      cookieResolver: async () => 'session=abc',
      requestIdResolver: async () => 'edge-42',
    });
    const result = await client.get('/me');
    expect(result.ok).toBe(true);
    expect(cookie).toBe('session=abc');
    expect(requestId).toBe('edge-42');
  });
});
