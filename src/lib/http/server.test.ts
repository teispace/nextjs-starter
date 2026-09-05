import { describe, expect, it, vi } from 'vitest';

const cookieStore = { all: [] as { name: string; value: string }[] };
const headerStore = { headers: new Headers() };
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => cookieStore.all }),
  headers: async () => headerStore.headers,
}));
vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    API_INTERNAL_URL: 'http://api.internal:4000',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const load = () => import('./server');

describe('server HTTP entry', () => {
  it('forwards only well-formed cookies and drops values that could splice the header', async () => {
    const { readForwardableCookieHeader } = await load();
    cookieStore.all = [
      { name: 'session', value: 'abc' },
      { name: 'bad name', value: 'x' },
      { name: 'evil', value: 'a; other=b' },
      { name: 'ctrl', value: 'a\nb' },
      { name: 'quoted', value: '"q"' },
    ];
    expect(await readForwardableCookieHeader()).toBe('session=abc');
  });

  it('honours an allowlist and returns undefined when nothing qualifies', async () => {
    const { readForwardableCookieHeader } = await load();
    cookieStore.all = [
      { name: 'session', value: 'abc' },
      { name: '_ga', value: 'GA1.2' },
    ];
    expect(await readForwardableCookieHeader(['session'])).toBe('session=abc');
    expect(await readForwardableCookieHeader(['other'])).toBeUndefined();
  });

  it('propagates only a valid incoming request id', async () => {
    const { readIncomingRequestId } = await load();
    headerStore.headers = new Headers({ 'x-request-id': 'edge-42' });
    expect(await readIncomingRequestId()).toBe('edge-42');
    headerStore.headers = new Headers({ 'x-request-id': 'not valid!' });
    expect(await readIncomingRequestId()).toBeUndefined();
  });

  it('prefers the internal API origin for server-to-server calls and appends the version prefix', async () => {
    const { getServerApiBaseUrl } = await load();
    expect(getServerApiBaseUrl()).toBe('http://api.internal:4000/api/v1');
  });
});
