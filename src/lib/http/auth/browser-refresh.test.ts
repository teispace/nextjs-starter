import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBrowserRefresh } from './browser-refresh';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('createBrowserRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts to the refresh route and reports success', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const refresh = createBrowserRefresh({ fetchFn });
    await expect(refresh()).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shares one in-flight refresh across concurrent callers', async () => {
    let resolve: (r: Response) => void = () => undefined;
    const fetchFn = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    const refresh = createBrowserRefresh({ fetchFn });
    const a = refresh();
    const b = refresh();
    resolve(new Response(null, { status: 204 }));
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('trips the loop guard after repeated attempts inside the cooldown and blocks until it lapses', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const refresh = createBrowserRefresh({ fetchFn, maxAttempts: 3, cooldownMs: 1000 });

    // Three attempts inside the window are allowed; the fourth trips the guard.
    await refresh();
    await refresh();
    await refresh();
    expect(fetchFn).toHaveBeenCalledTimes(3);

    await refresh();
    expect(fetchFn).toHaveBeenCalledTimes(3);

    // Still blocked inside the cooldown; free again once it lapses.
    vi.advanceTimersByTime(500);
    await refresh();
    expect(fetchFn).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(600);
    await refresh();
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('treats a thrown fetch as a failed refresh', async () => {
    const refresh = createBrowserRefresh({
      fetchFn: vi.fn().mockRejectedValue(new Error('offline')),
    });
    await expect(refresh()).resolves.toBe(false);
  });
});
