import { AppPaths } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { DataKey, RefreshState } from '@/types';

export function handleUnauthorizedRedirect(): void {
  if (typeof window === 'undefined') return;

  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${AppPaths.auth.login}?redirectTo=${redirect}`;
}

export const TOKEN_REFRESH_CONFIG = {
  MAX_ATTEMPTS: 3,
  COOLDOWN_MS: 1000,
} as const;

export function extractDataByKey<T>(data: unknown, dataKey?: DataKey): T {
  if (!dataKey) return data as T;
  return (
    data && typeof data === 'object' && dataKey in data
      ? (data as Record<string, unknown>)[dataKey]
      : data
  ) as T;
}

export class TokenRefreshManager {
  private state: RefreshState = {
    isRefreshing: false,
    queue: [],
    attempts: 0,
    lastAttempt: 0,
    blockedUntil: 0,
  };

  async handleRefresh(refreshFn: () => Promise<string | null>): Promise<string | null> {
    if (this.state.isRefreshing) {
      return new Promise((resolve) => this.state.queue.push(resolve));
    }

    const now = Date.now();

    // Hard stop: once the loop guard trips, refuse every refresh until a full
    // cooldown elapses. Without this the attempt counter re-arms instantly and
    // a server that 401s every refresh produces unbounded repeating bursts.
    if (now < this.state.blockedUntil) {
      return null;
    }

    if (now - this.state.lastAttempt < TOKEN_REFRESH_CONFIG.COOLDOWN_MS) {
      this.state.attempts++;
      if (this.state.attempts >= TOKEN_REFRESH_CONFIG.MAX_ATTEMPTS) {
        logger.error('Max refresh attempts reached. Stopping to prevent infinite loop.');
        this.state.attempts = 0;
        this.state.blockedUntil = now + TOKEN_REFRESH_CONFIG.COOLDOWN_MS;
        return null;
      }
    } else {
      this.state.attempts = 0;
    }
    this.state.lastAttempt = now;

    this.state.isRefreshing = true;

    const drainQueue = (token: string | null): void => {
      const waiters = this.state.queue;
      this.state.queue = [];
      for (const resolve of waiters) {
        resolve(token);
      }
    };

    try {
      const token = await refreshFn();
      drainQueue(token);
      return token;
    } catch (err) {
      logger.error({ err }, 'Unexpected error in token refresh');
      drainQueue(null);
      return null;
    } finally {
      this.state.isRefreshing = false;
    }
  }
}

/**
 * Refresh managers are shared per upstream (`baseURL`), NOT per client
 * instance. The `fetchClient` and `axiosClient` both point at the same API,
 * so they must share one singleflight latch — otherwise a burst of 401s
 * split across the two clients would each trigger their own refresh and, with
 * a rotating refresh token, the second refresh would present an
 * already-consumed token and the server's reuse-detection would revoke every
 * session. Keying by `baseURL` also keeps custom clients pointed at a
 * different service isolated from the main app's refresh cycle.
 */
const refreshManagers = new Map<string, TokenRefreshManager>();

/** Get (or lazily create) the shared `TokenRefreshManager` for an upstream. */
export function getRefreshManager(baseURL: string): TokenRefreshManager {
  let manager = refreshManagers.get(baseURL);
  if (!manager) {
    manager = new TokenRefreshManager();
    refreshManagers.set(baseURL, manager);
  }
  return manager;
}

/**
 * Clear the shared refresh-manager registry. Test-only — lets each test start
 * from a clean singleflight state without leaking attempt counters between
 * cases. No-op cost in production (never called there).
 */
export function __resetRefreshManagersForTests(): void {
  refreshManagers.clear();
}
