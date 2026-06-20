import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetRefreshManagersForTests,
  extractDataByKey,
  getRefreshManager,
  handleUnauthorizedRedirect,
  TOKEN_REFRESH_CONFIG,
  TokenRefreshManager,
} from './client-utils';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Placeholder for promise resolvers reassigned synchronously inside the executor.
const noop = (..._args: unknown[]): void => undefined;

describe('extractDataByKey', () => {
  it('returns the raw value when dataKey is null/undefined', () => {
    expect(extractDataByKey({ data: 1 }, null)).toEqual({ data: 1 });
    expect(extractDataByKey({ data: 1 }, undefined)).toEqual({ data: 1 });
  });

  it('extracts the named key when present', () => {
    expect(extractDataByKey<number>({ data: 42 }, 'data')).toBe(42);
    expect(extractDataByKey<string>({ items: 'x', meta: 'y' }, 'items')).toBe('x');
  });

  it('returns the raw value when the key is missing', () => {
    const raw = { foo: 1 };
    expect(extractDataByKey(raw, 'data')).toBe(raw);
  });

  it('returns the raw value when input is not an object', () => {
    expect(extractDataByKey<number>(42, 'data')).toBe(42);
    expect(extractDataByKey(null, 'data')).toBe(null);
  });
});

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager;

  beforeEach(() => {
    manager = new TokenRefreshManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the token from the refresh function', async () => {
    const refreshFn = vi.fn().mockResolvedValue('new-token');
    const result = await manager.handleRefresh(refreshFn);
    expect(result).toBe('new-token');
    expect(refreshFn).toHaveBeenCalledOnce();
  });

  it('queues concurrent callers and drains them with the same token', async () => {
    let resolveRefresh: (t: string | null) => void = noop;
    const refreshFn = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    // First caller triggers the refresh; subsequent callers should queue.
    const p1 = manager.handleRefresh(refreshFn);
    const p2 = manager.handleRefresh(refreshFn);
    const p3 = manager.handleRefresh(refreshFn);

    resolveRefresh('shared-token');

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(refreshFn).toHaveBeenCalledOnce(); // only the first caller invokes
    expect(r1).toBe('shared-token');
    expect(r2).toBe('shared-token');
    expect(r3).toBe('shared-token');
  });

  it('returns null when refreshFn returns null and drains queue with null', async () => {
    let resolveRefresh: (t: string | null) => void = noop;
    const refreshFn = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const p1 = manager.handleRefresh(refreshFn);
    const p2 = manager.handleRefresh(refreshFn);

    resolveRefresh(null);

    expect(await p1).toBeNull();
    expect(await p2).toBeNull();
  });

  it('drains queue with null when refreshFn throws', async () => {
    let rejectRefresh: (reason: unknown) => void = noop;
    const refreshFn = vi.fn(
      () =>
        new Promise<string | null>((_, reject) => {
          rejectRefresh = reject;
        }),
    );

    const p1 = manager.handleRefresh(refreshFn);
    const p2 = manager.handleRefresh(refreshFn);

    rejectRefresh(new Error('boom'));

    expect(await p1).toBeNull();
    expect(await p2).toBeNull();
  });

  it('returns null and resets after MAX_ATTEMPTS within COOLDOWN_MS', async () => {
    const refreshFn = vi.fn().mockResolvedValue('t');

    // First call passes (attempts counter starts at 0, no cooldown comparison applies).
    // Calls 2, 3 within cooldown bump attempts to 1, 2 — still under MAX_ATTEMPTS=3.
    // Call 4 within cooldown bumps attempts to 3 — trips the guard, returns null.
    await manager.handleRefresh(refreshFn);
    await manager.handleRefresh(refreshFn);
    await manager.handleRefresh(refreshFn);
    const tripped = await manager.handleRefresh(refreshFn);

    expect(tripped).toBeNull();
    expect(refreshFn).toHaveBeenCalledTimes(3); // 4th call short-circuits before invoking
  });

  it('resets the attempt counter after cooldown elapses', async () => {
    const refreshFn = vi.fn().mockResolvedValue('t');

    // Pump the counter up close to the limit (attempts becomes 2 after these three calls).
    await manager.handleRefresh(refreshFn);
    await manager.handleRefresh(refreshFn);
    await manager.handleRefresh(refreshFn);

    // Advance past the cooldown so the next call hits the reset branch.
    vi.setSystemTime(Date.now() + TOKEN_REFRESH_CONFIG.COOLDOWN_MS + 100);

    // This would have tripped MAX_ATTEMPTS without the reset; now it goes through.
    const result = await manager.handleRefresh(refreshFn);
    expect(result).toBe('t');
    expect(refreshFn).toHaveBeenCalledTimes(4);
  });

  it('allows a follow-up refresh after one completes (isRefreshing flag is reset)', async () => {
    const refreshFn = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    expect(await manager.handleRefresh(refreshFn)).toBe('first');
    expect(await manager.handleRefresh(refreshFn)).toBe('second');
  });
});

describe('handleUnauthorizedRedirect', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // jsdom exposes window.location with a configurable href setter.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { pathname: '/secret', search: '?foo=bar', href: 'http://localhost/' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('redirects to the login path with the current URL encoded as redirectTo', () => {
    handleUnauthorizedRedirect();
    expect(window.location.href).toMatch(/redirectTo=%2Fsecret%3Ffoo%3Dbar$/);
  });
});

describe('getRefreshManager (shared per-baseURL singleflight)', () => {
  beforeEach(() => {
    __resetRefreshManagersForTests();
  });

  it('returns the same manager instance for the same baseURL', () => {
    const a = getRefreshManager('https://api.example.com/api/v1');
    const b = getRefreshManager('https://api.example.com/api/v1');
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(TokenRefreshManager);
  });

  it('returns distinct managers for different baseURLs', () => {
    const a = getRefreshManager('https://api.example.com/api/v1');
    const b = getRefreshManager('https://other.internal/api/v1');
    expect(a).not.toBe(b);
  });

  it('shares singleflight state across callers of the same baseURL', async () => {
    // Two "clients" (fetch + axios) resolving 401s concurrently against the
    // same upstream must trigger exactly ONE refresh — not one each — or the
    // rotating refresh token would be double-spent.
    let resolveRefresh: (t: string | null) => void = noop;
    const refreshFn = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const m1 = getRefreshManager('https://api.example.com/api/v1');
    const m2 = getRefreshManager('https://api.example.com/api/v1');

    const p1 = m1.handleRefresh(refreshFn);
    const p2 = m2.handleRefresh(refreshFn);

    resolveRefresh('shared');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(refreshFn).toHaveBeenCalledOnce();
    expect(r1).toBe('shared');
    expect(r2).toBe('shared');
  });
});
