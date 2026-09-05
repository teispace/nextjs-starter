// @vitest-environment jsdom
import { delay, HttpResponse, http as mswHttp } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { HTTP_ERROR_CODE, HttpError, ResponseValidationError } from '@/lib/errors';

// @next-maker:axios
import { axiosAdapter } from '../adapters/axios';
import { fetchAdapter } from '../adapters/fetch';
import type { Adapter } from '../types';
import { createHttpClient } from './client';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const BASE = 'https://api.example.test/api/v1';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const adapters: [string, () => Adapter][] = [
  ['fetch', () => fetchAdapter],
  // @next-maker:axios
  ['axios', () => axiosAdapter()],
];

describe.each(adapters)('HttpClient over %s', (_name, makeAdapter) => {
  const make = (options: Parameters<typeof createHttpClient>[0] = {}) =>
    createHttpClient({ baseURL: BASE, adapter: makeAdapter(), retry: false, ...options });

  it('unwraps the data envelope and serialises typed params', async () => {
    server.use(
      mswHttp.get(`${BASE}/users`, ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
          data: {
            page: url.searchParams.get('page'),
            tags: url.searchParams.getAll('tag'),
            empty: url.searchParams.has('empty'),
          },
        });
      }),
    );
    const result = await make().get<{ page: string; tags: string[]; empty: boolean }>('/users', {
      params: { page: 2, tag: ['a', 'b'], empty: '', nil: null },
    });
    expect(result).toEqual({ ok: true, data: { page: '2', tags: ['a', 'b'], empty: false } });
  });

  it('exposes the final response to onResponse for header-only consumers', async () => {
    server.use(
      mswHttp.post(`${BASE}/logout`, () =>
        HttpResponse.json({ data: null }, { headers: { 'set-cookie': 'session=; Max-Age=0' } }),
      ),
    );
    const seen: Response[] = [];
    const result = await make().post('/logout', undefined, {
      onResponse: (response) => seen.push(response),
    });
    expect(result.ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get('set-cookie')).toContain('session=');
  });

  it('stamps a request id and keeps a valid caller-provided one', async () => {
    const seen: string[] = [];
    server.use(
      mswHttp.get(`${BASE}/ping`, ({ request }) => {
        seen.push(request.headers.get('x-request-id') ?? '');
        return HttpResponse.json({ data: null });
      }),
    );
    await make().get('/ping');
    await make().get('/ping', { headers: { 'X-Request-Id': 'trace-123' } });
    await make().get('/ping', { headers: { 'X-Request-Id': 'bad id!' } });
    expect(seen[0]).toMatch(/^[A-Za-z0-9_-]{1,128}$/);
    expect(seen[1]).toBe('trace-123');
    expect(seen[2]).not.toBe('bad id!');
  });

  it('JSON-encodes plain bodies, including falsy primitives', async () => {
    const bodies: { type: string | null; text: string }[] = [];
    server.use(
      mswHttp.post(`${BASE}/echo`, async ({ request }) => {
        bodies.push({ type: request.headers.get('content-type'), text: await request.text() });
        return HttpResponse.json({ data: 'ok' });
      }),
    );
    await make().post('/echo', { a: 1 });
    await make().post('/echo', 0);
    expect(bodies[0]).toEqual({ type: 'application/json', text: '{"a":1}' });
    expect(bodies[1]).toEqual({ type: 'application/json', text: '0' });
  });

  it('passes FormData through so the runtime sets the multipart boundary', async () => {
    let contentType = '';
    let field = '';
    server.use(
      mswHttp.post(`${BASE}/upload`, async ({ request }) => {
        contentType = request.headers.get('content-type') ?? '';
        field = String((await request.formData()).get('name'));
        return HttpResponse.json({ data: 'ok' });
      }),
    );
    const form = new FormData();
    form.set('name', 'avatar');
    const result = await make().post('/upload', form);
    expect(result.ok).toBe(true);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(field).toBe('avatar');
  });

  it('resolves 204 to undefined instead of a Blob', async () => {
    server.use(mswHttp.delete(`${BASE}/users/1`, () => new HttpResponse(null, { status: 204 })));
    const result = await make().delete('/users/1');
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('maps an error envelope to HttpError with code, field errors and the header request id', async () => {
    server.use(
      mswHttp.post(`${BASE}/users`, () =>
        HttpResponse.json(
          {
            status: 422,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: [{ email: 'Invalid' }],
          },
          { status: 422, headers: { 'X-Request-Id': 'req-9' } },
        ),
      ),
    );
    const result = await make().post('/users', { email: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(HttpError);
    expect(result.error.status).toBe(422);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.fieldError('email')).toBe('Invalid');
    expect(result.error.requestId).toBe('req-9');
  });

  it('validates the unwrapped body with a schema', async () => {
    server.use(
      mswHttp.get(`${BASE}/me`, () => HttpResponse.json({ data: { id: 1, email: 'a@b.c' } })),
    );
    const schema = z.object({ id: z.string(), email: z.string() });
    const result = await make().get('/me', { schema });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ResponseValidationError);
    expect(result.error.code).toBe(HTTP_ERROR_CODE.RESPONSE_INVALID);
    expect((result.error as ResponseValidationError).issues[0]?.path).toBe('id');

    const good = await make().get('/me', {
      schema: z.object({ id: z.number(), email: z.string() }),
    });
    expect(good).toEqual({ ok: true, data: { id: 1, email: 'a@b.c' } });
  });

  it('refreshes once on 401 and replays the request', async () => {
    let calls = 0;
    server.use(
      mswHttp.get(`${BASE}/private`, () => {
        calls++;
        return calls === 1
          ? HttpResponse.json({ status: 401, message: 'Expired' }, { status: 401 })
          : HttpResponse.json({ data: 'secret' });
      }),
    );
    const refresh = vi.fn().mockResolvedValue(true);
    const onUnauthorized = vi.fn();
    const result = await make({ auth: { refresh, onUnauthorized } }).get('/private');
    expect(result).toEqual({ ok: true, data: 'secret' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(calls).toBe(2);
  });

  it('calls onUnauthorized and fails when the refresh does not recover the session', async () => {
    server.use(
      mswHttp.get(`${BASE}/private`, () => HttpResponse.json({ message: 'nope' }, { status: 401 })),
    );
    const refresh = vi.fn().mockResolvedValue(false);
    const onUnauthorized = vi.fn();
    const result = await make({ auth: { refresh, onUnauthorized } }).get('/private');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('never refreshes when skipAuth is set, so a failed sign-in does not redirect', async () => {
    server.use(
      mswHttp.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ message: 'bad creds' }, { status: 401 }),
      ),
    );
    const refresh = vi.fn();
    const onUnauthorized = vi.fn();
    const result = await make({ auth: { refresh, onUnauthorized } }).post(
      '/auth/login',
      { u: 1 },
      { skipAuth: true },
    );
    expect(result.ok).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('retries idempotent requests on transient statuses and honours Retry-After', async () => {
    let calls = 0;
    server.use(
      mswHttp.get(`${BASE}/flaky`, () => {
        calls++;
        return calls < 3
          ? new HttpResponse(null, { status: 503, headers: { 'Retry-After': '0' } })
          : HttpResponse.json({ data: 'finally' });
      }),
    );
    const result = await make({ retry: { retries: 2, baseDelayMs: 1, maxDelayMs: 2 } }).get(
      '/flaky',
    );
    expect(result).toEqual({ ok: true, data: 'finally' });
    expect(calls).toBe(3);
  });

  it('does not retry non-idempotent requests', async () => {
    let calls = 0;
    server.use(
      mswHttp.post(`${BASE}/orders`, () => {
        calls++;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const result = await make({ retry: { retries: 2, baseDelayMs: 1 } }).post('/orders', {});
    expect(result.ok).toBe(false);
    expect(calls).toBe(1);
  });

  it('classifies a caller abort as cancelled', async () => {
    server.use(
      mswHttp.get(`${BASE}/slow`, async () => {
        await delay(200);
        return HttpResponse.json({ data: 1 });
      }),
    );
    const controller = new AbortController();
    const pending = make().get('/slow', { signal: controller.signal });
    controller.abort();
    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.isCancelled()).toBe(true);
  });

  it('classifies an exceeded timeout budget as a timeout', async () => {
    server.use(
      mswHttp.get(`${BASE}/slow`, async () => {
        await delay(300);
        return HttpResponse.json({ data: 1 });
      }),
    );
    const result = await make().get('/slow', { timeout: 30 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.isTimeout()).toBe(true);
  });

  it('classifies a transport failure as a network error with status 0', async () => {
    server.use(mswHttp.get(`${BASE}/down`, () => HttpResponse.error()));
    const result = await make().get('/down');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.isNetworkError()).toBe(true);
      expect(result.error.isClientFailure()).toBe(true);
    }
  });
});
