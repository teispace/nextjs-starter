import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

import { AppApis } from '@/lib/config/app-apis';
import { http } from '@/lib/http';
import { unwrapForQuery } from '@/lib/query';

import { accountKeys } from './keys';
import { signInCapabilitiesSchema } from './schema';

/**
 * Client-side reads. `queryOptions` keeps key, fetcher, and types together
 * so a Server Component can `prefetchQuery(signInCapabilitiesQuery())` and
 * the client hook below picks the data up from the hydration boundary.
 */
export const signInCapabilitiesQuery = () =>
  queryOptions({
    queryKey: accountKeys.signInCapabilities(),
    queryFn: ({ signal }) =>
      http
        .get(AppApis.auth.capabilities, {
          schema: signInCapabilitiesSchema,
          skipAuth: true,
          signal,
        })
        .then(unwrapForQuery),
    staleTime: 5 * 60 * 1000,
  });

export const useSignInCapabilities = () => useSuspenseQuery(signInCapabilitiesQuery());
