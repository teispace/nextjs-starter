// @vitest-environment node

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { AsyncLocalStorage } from 'node:async_hooks';

// The proxy itself delegates to next-intl's middleware factory, which is not
// under test here; stub it so importing `./proxy` only yields the matcher.
vi.mock('next-intl/middleware', () => ({ default: () => () => undefined }));

// Next's testing helpers expect the runtime to have installed a global
// AsyncLocalStorage; provide Node's before the module is loaded.
type Matcher = (args: { config: unknown; nextConfig: object; url: string }) => boolean;
let doesProxyMatch: Matcher;
let config: unknown;

beforeAll(async () => {
  (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
  const testing = await import('next/experimental/testing/server');
  doesProxyMatch = testing.unstable_doesMiddlewareMatch as Matcher;
  ({ config } = await import('./proxy'));
});

const matches = (url: string): boolean => doesProxyMatch({ config, nextConfig: {}, url });

describe('proxy matcher', () => {
  it('runs on page routes so next-intl can negotiate the locale', () => {
    expect(matches('/')).toBe(true);
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/auth/login?redirectTo=%2F')).toBe(true);
  });

  it('skips Next internals, API routes, and static assets', () => {
    expect(matches('/api/health')).toBe(false);
    expect(matches('/_next/static/chunks/main.js')).toBe(false);
    expect(matches('/_next/image?url=x')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
    expect(matches('/fonts/livvic.woff2')).toBe(false);
  });

  it('skips static metadata files but routes extensionless metadata through the locale rewrite', () => {
    // `[locale]/opengraph-image.tsx` is served at `/opengraph-image` only
    // because the proxy rewrites it under the active locale, exactly like a page.
    expect(matches('/opengraph-image')).toBe(true);
    expect(matches('/icon')).toBe(true);
    expect(matches('/opengraph-image.png')).toBe(false);
    expect(matches('/apple-icon.png')).toBe(false);
    expect(matches('/robots.txt')).toBe(false);
    expect(matches('/sitemap.xml')).toBe(false);
    expect(matches('/manifest.webmanifest')).toBe(false);
  });

  it('still runs on pages whose path merely starts with a metadata name', () => {
    expect(matches('/icons')).toBe(true);
    expect(matches('/iconography/guide')).toBe(true);
  });
});
