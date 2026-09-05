// @vitest-environment node

import { beforeAll, describe, expect, it } from 'vitest';

import { AsyncLocalStorage } from 'node:async_hooks';

type Matcher = (args: { config: unknown; nextConfig: object; url: string }) => boolean;
let doesProxyMatch: Matcher;
let config: unknown;
let proxy: (request: Request) => Response;

beforeAll(async () => {
  (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
  const testing = await import('next/experimental/testing/server');
  doesProxyMatch = testing.unstable_doesMiddlewareMatch as Matcher;
  ({ config, proxy } = (await import('./proxy')) as unknown as {
    config: unknown;
    proxy: (request: Request) => Response;
  });
});

const matches = (url: string): boolean => doesProxyMatch({ config, nextConfig: {}, url });

describe('proxy matcher', () => {
  it('runs on page routes', () => {
    expect(matches('/')).toBe(true);
    expect(matches('/dashboard')).toBe(true);
  });

  it('skips Next internals, API routes, metadata files, and static assets', () => {
    expect(matches('/api/health')).toBe(false);
    expect(matches('/_next/static/chunks/main.js')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
    expect(matches('/opengraph-image')).toBe(false);
    expect(matches('/manifest.webmanifest')).toBe(false);
    expect(matches('/fonts/livvic.woff2')).toBe(false);
  });
});

describe('proxy request id', () => {
  const run = (headers?: HeadersInit) =>
    proxy(new Request('https://app.example.com/', { headers }));

  it('mints an id and echoes it on the response', () => {
    expect(run().headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps a well-formed incoming id and replaces a malformed one', () => {
    expect(run({ 'x-request-id': 'edge-42' }).headers.get('x-request-id')).toBe('edge-42');
    expect(run({ 'x-request-id': 'bad id!' }).headers.get('x-request-id')).not.toBe('bad id!');
  });
});
