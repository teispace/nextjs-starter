import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RETRY_POLICY,
  isRetryableMethod,
  isRetryableStatus,
  resolveRetryPolicy,
  retryDelayMs,
  sleep,
} from './retry';

describe('retry policy', () => {
  it('resolves per-request over client over defaults, and false disables', () => {
    expect(resolveRetryPolicy(undefined, undefined)).toEqual(DEFAULT_RETRY_POLICY);
    expect(resolveRetryPolicy({ retries: 5 }, { baseDelayMs: 1 })).toMatchObject({
      retries: 5,
      baseDelayMs: 1,
    });
    expect(resolveRetryPolicy(false, undefined)).toBeNull();
    expect(resolveRetryPolicy({ retries: 5 }, false)).toBeNull();
    expect(resolveRetryPolicy(false, { retries: 1 })).toMatchObject({ retries: 1 });
  });

  it('only retries idempotent methods and transient statuses by default', () => {
    expect(isRetryableMethod(DEFAULT_RETRY_POLICY, 'GET')).toBe(true);
    expect(isRetryableMethod(DEFAULT_RETRY_POLICY, 'POST')).toBe(false);
    expect(isRetryableStatus(DEFAULT_RETRY_POLICY, 503)).toBe(true);
    expect(isRetryableStatus(DEFAULT_RETRY_POLICY, 404)).toBe(false);
  });

  it('honours Retry-After seconds and otherwise backs off with jitter', () => {
    expect(retryDelayMs(DEFAULT_RETRY_POLICY, 0, '2')).toBe(2000);
    const jittered = retryDelayMs(
      { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100, maxDelayMs: 1000 },
      2,
      null,
      () => 0.5,
    );
    expect(jittered).toBe(200);
    expect(
      retryDelayMs(
        { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100, maxDelayMs: 150 },
        5,
        null,
        () => 1,
      ),
    ).toBe(150);
  });

  it('sleep rejects promptly when the signal aborts', async () => {
    const controller = new AbortController();
    const promise = sleep(10_000, controller.signal);
    controller.abort(new Error('stop'));
    await expect(promise).rejects.toThrow('stop');
  });
});
