import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryStore, rateLimit, rateLimitHeaders, tooManyRequests } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to the limit and refuses the next request', async () => {
    const store = createMemoryStore();
    const call = () => rateLimit({ key: 'k', limit: 3, windowMs: 1000, store });

    expect((await call()).remaining).toBe(2);
    expect((await call()).remaining).toBe(1);
    const last = await call();
    expect(last.ok).toBe(true);
    expect(last.remaining).toBe(0);

    const refused = await call();
    expect(refused.ok).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(0);
  });

  it('starts a new window once the old one passes', async () => {
    const store = createMemoryStore();
    const call = () => rateLimit({ key: 'k', limit: 1, windowMs: 1000, store });

    expect((await call()).ok).toBe(true);
    expect((await call()).ok).toBe(false);

    vi.advanceTimersByTime(1001);
    expect((await call()).ok).toBe(true);
  });

  it('counts each key separately', async () => {
    const store = createMemoryStore();
    await rateLimit({ key: 'a', limit: 1, windowMs: 1000, store });
    const other = await rateLimit({ key: 'b', limit: 1, windowMs: 1000, store });
    expect(other.ok).toBe(true);
  });

  it('forgets a key on reset', async () => {
    const store = createMemoryStore();
    await rateLimit({ key: 'k', limit: 1, windowMs: 1000, store });
    await store.reset('k');
    expect((await rateLimit({ key: 'k', limit: 1, windowMs: 1000, store })).ok).toBe(true);
  });
});

describe('response shape', () => {
  it('advertises the limit and asks a refused caller to wait', () => {
    const allowed = rateLimitHeaders({
      ok: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 30_000,
      retryAfter: 0,
    });
    expect(allowed['RateLimit-Limit']).toBe('10');
    expect(allowed['RateLimit-Remaining']).toBe('9');
    expect(allowed['Retry-After']).toBeUndefined();

    const refused = tooManyRequests({
      ok: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfter: 30,
    });
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('30');
  });
});
