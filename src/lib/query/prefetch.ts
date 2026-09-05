import type { DefaultError, QueryExecuteOptions, QueryKey } from '@tanstack/react-query';

import { getQueryClient } from './client';

// biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
const noop = () => {};

/**
 * Warm the request-scoped cache from a Server Component.
 *
 * Failures are swallowed on purpose: a failed prefetch is not dehydrated,
 * so the client component fetches again and owns the error state. Awaiting
 * the result keeps the data in the HTML; skipping the await streams it.
 */
export const prefetchQuery = <
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
>(
  options: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam>,
): Promise<void> => getQueryClient().query(options).then(noop, noop);
