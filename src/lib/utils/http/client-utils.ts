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
  };

  async handleRefresh(refreshFn: () => Promise<string | null>): Promise<string | null> {
    if (this.state.isRefreshing) {
      return new Promise((resolve) => this.state.queue.push(resolve));
    }

    const now = Date.now();
    if (now - this.state.lastAttempt < TOKEN_REFRESH_CONFIG.COOLDOWN_MS) {
      this.state.attempts++;
      if (this.state.attempts >= TOKEN_REFRESH_CONFIG.MAX_ATTEMPTS) {
        logger.error('Max refresh attempts reached. Stopping to prevent infinite loop.');
        this.state.attempts = 0;
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
