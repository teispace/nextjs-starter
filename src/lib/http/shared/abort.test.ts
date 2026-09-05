import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_CODE, HttpError } from '@/lib/errors';

import { abortToHttpError, buildAbortSignal, isAbortError } from './abort';

describe('buildAbortSignal', () => {
  it('returns no signal when there is neither caller signal nor timeout', () => {
    const { signal } = buildAbortSignal(undefined, undefined);
    expect(signal).toBeUndefined();
  });

  it('treats 0 / negative / non-finite timeout as unbounded', () => {
    expect(buildAbortSignal(undefined, 0).signal).toBeUndefined();
    expect(buildAbortSignal(undefined, -5).signal).toBeUndefined();
    expect(buildAbortSignal(undefined, Number.NaN).signal).toBeUndefined();
    expect(buildAbortSignal(undefined, Number.POSITIVE_INFINITY).signal).toBeUndefined();
  });

  it('returns the caller signal untouched when there is no timeout', () => {
    const ac = new AbortController();
    const { signal } = buildAbortSignal(ac.signal, 0);
    expect(signal).toBe(ac.signal);
  });

  it('returns a timeout-only signal when there is no caller signal', () => {
    const { signal, isTimeout } = buildAbortSignal(undefined, 10_000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(isTimeout()).toBe(false); // not fired yet
  });

  it('composes both into one signal that aborts when the caller aborts', () => {
    const ac = new AbortController();
    const { signal, isTimeout } = buildAbortSignal(ac.signal, 10_000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal).not.toBe(ac.signal); // a merged signal, not the original

    ac.abort();
    expect(signal?.aborted).toBe(true);
    expect(isTimeout()).toBe(false); // caller aborted, not the timeout
  });
});

describe('isAbortError', () => {
  it('recognises AbortError and TimeoutError DOMExceptions', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new DOMException('timed out', 'TimeoutError'))).toBe(true);
  });

  it('rejects ordinary errors and non-errors', () => {
    expect(isAbortError(new Error('ECONNREFUSED'))).toBe(false);
    expect(isAbortError(new DOMException('nope', 'DataError'))).toBe(false);
    expect(isAbortError('aborted')).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});

describe('abortToHttpError', () => {
  it('returns null for a non-abort error so the caller can fall through', () => {
    expect(abortToHttpError(new Error('boom'), false)).toBeNull();
  });

  it('maps an AbortError to a cancelled exception by default', () => {
    const ex = abortToHttpError(new DOMException('aborted', 'AbortError'), false);
    expect(ex).toBeInstanceOf(HttpError);
    expect(ex?.code).toBe(HTTP_ERROR_CODE.CANCELLED);
    expect(ex?.status).toBe(0);
    expect(ex?.isCancelled()).toBe(true);
  });

  it('maps an AbortError to a timeout when preferTimeout is set', () => {
    const ex = abortToHttpError(new DOMException('aborted', 'AbortError'), true);
    expect(ex?.code).toBe(HTTP_ERROR_CODE.TIMEOUT);
    expect(ex?.isTimeout()).toBe(true);
  });

  it('maps a native TimeoutError to a timeout even without preferTimeout', () => {
    const ex = abortToHttpError(new DOMException('timed out', 'TimeoutError'), false);
    expect(ex?.code).toBe(HTTP_ERROR_CODE.TIMEOUT);
    expect(ex?.isTimeout()).toBe(true);
  });
});
