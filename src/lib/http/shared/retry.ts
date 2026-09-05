import type { HttpMethod, RetryPolicy } from '../types';

/**
 * Bounded retry for transient failures, with full jitter so a fleet of
 * clients does not retry in lockstep. Only idempotent methods are retried by
 * default; a `POST` that timed out may have succeeded server-side.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  retries: 2,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  statuses: [408, 425, 429, 500, 502, 503, 504],
  baseDelayMs: 200,
  maxDelayMs: 2_000,
  retryOnNetworkError: true,
};

export const resolveRetryPolicy = (
  base: Partial<RetryPolicy> | false | undefined,
  perRequest: Partial<RetryPolicy> | false | undefined,
): RetryPolicy | null => {
  if (perRequest === false) return null;
  if (perRequest === undefined && base === false) return null;
  return { ...DEFAULT_RETRY_POLICY, ...(base || {}), ...(perRequest || {}) };
};

export const isRetryableMethod = (policy: RetryPolicy, method: HttpMethod): boolean =>
  policy.methods.includes(method);

export const isRetryableStatus = (policy: RetryPolicy, status: number): boolean =>
  policy.statuses.includes(status);

/** Honour `Retry-After` (seconds or HTTP date) when present, else exponential backoff with jitter. */
export const retryDelayMs = (
  policy: RetryPolicy,
  attempt: number,
  retryAfter: string | null,
  random: () => number = Math.random,
): number => {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, policy.maxDelayMs * 10);
    }
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date))
      return Math.max(0, Math.min(date - Date.now(), policy.maxDelayMs * 10));
  }
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
  return Math.floor(random() * exponential);
};

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
