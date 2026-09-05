import { cache } from 'react';

import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

import { HttpError } from '@/lib/errors';
import { isServer } from '@/lib/runtime';

/**
 * Query client defaults shared by server prefetching and the browser.
 *
 * `staleTime` above zero matters on the server: without it every query
 * hydrated into the client refetches immediately on mount. Pending queries
 * are dehydrated too, so a Server Component can start a fetch and let the
 * client `useSuspenseQuery` stream its result.
 */
export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          // The transport already retried transient failures; only network
          // blips are worth another attempt at this layer, and never 4xx.
          if (error instanceof HttpError && !error.isNetworkError()) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldRedactErrors: () => false,
      },
      mutations: { retry: 0 },
    },
  });

let browserQueryClient: QueryClient | undefined;

// One client per request on the server (React `cache` scopes it to the
// render), one per tab in the browser (survives Suspense re-renders).
const getServerQueryClient = cache(makeQueryClient);

export const getQueryClient = (): QueryClient => {
  if (isServer()) return getServerQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
};
