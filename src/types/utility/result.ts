import { HttpError } from '@/lib/errors/http-error';

/**
 * A plain, serialisable success-or-failure value.
 *
 * Deliberately not a class: results cross the Server Component boundary,
 * come back from Server Actions, and sit in Redux state, all of which
 * require plain objects. Narrow with `result.ok`, or use the helpers.
 */
export type Ok<T> = { readonly ok: true; readonly data: T };
export type Fail<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = HttpError> = Ok<T> | Fail<E>;
export type ResultAsync<T, E = HttpError> = Promise<Result<T, E>>;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isFail = <T, E>(result: Result<T, E>): result is Fail<E> => !result.ok;

/** Return the data or throw the error. For code paths where failure is exceptional. */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.data;
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.data : fallback;

export const mapOk = <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.data)) : result;

export const mapFail = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : fail(fn(result.error));

export const match = <T, E, R>(
  result: Result<T, E>,
  handlers: { ok: (data: T) => R; fail: (error: E) => R },
): R => (result.ok ? handlers.ok(result.data) : handlers.fail(result.error));

/** Wrap a promise that may throw into a result; thrown values become `HttpError`s. */
export const fromPromise = async <T>(promise: Promise<T>): ResultAsync<T> => {
  try {
    return ok(await promise);
  } catch (error) {
    return fail(HttpError.from(error));
  }
};
