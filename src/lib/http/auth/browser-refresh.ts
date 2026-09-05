import { logger } from '@/lib/logger';

export interface BrowserRefreshOptions {
  /** Same-origin Route Handler that forwards the refresh to the API and relays `Set-Cookie`. */
  path?: string;
  /** Refresh attempts inside this window before the guard trips. */
  maxAttempts?: number;
  /** Window for the attempt counter, and the block applied when it trips. */
  cooldownMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Browser-side session refresh with a singleflight latch.
 *
 * Concurrent 401s share one in-flight refresh. A server that keeps rejecting
 * refreshes trips a loop guard that blocks further attempts for a cooldown,
 * so a revoked session produces one burst, not an unbounded stream.
 *
 * This state is per browser tab, which is exactly one user. It must never be
 * used on the server, where module state is shared by every request.
 */
export const createBrowserRefresh = (options: BrowserRefreshOptions = {}) => {
  const {
    path = '/api/auth/refresh',
    maxAttempts = 3,
    cooldownMs = 1_000,
    fetchFn = (...args: Parameters<typeof fetch>) => fetch(...args),
  } = options;

  let inFlight: Promise<boolean> | null = null;
  let attempts = 0;
  let lastAttempt = 0;
  let blockedUntil = 0;

  const run = async (): Promise<boolean> => {
    try {
      const res = await fetchFn(path, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      return res.ok;
    } catch (err) {
      logger.error({ err }, 'Session refresh failed');
      return false;
    }
  };

  return async (): Promise<boolean> => {
    if (inFlight) return inFlight;

    const now = Date.now();
    if (now < blockedUntil) return false;

    if (now - lastAttempt < cooldownMs) {
      attempts++;
      if (attempts >= maxAttempts) {
        logger.error('Max session refresh attempts reached; backing off.');
        attempts = 0;
        blockedUntil = now + cooldownMs;
        return false;
      }
    } else {
      attempts = 0;
    }
    lastAttempt = now;

    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
};
