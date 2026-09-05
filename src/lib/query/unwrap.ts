import type { Result } from '@/types';

/**
 * Bridge the transport's `Result` into TanStack Query, which expects
 * `queryFn` to throw on failure so `error`, `retry`, and boundaries work.
 */
export const unwrapForQuery = <T, E extends Error>(result: Result<T, E>): T => {
  if (result.ok) return result.data;
  throw result.error;
};
