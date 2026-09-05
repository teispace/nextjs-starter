import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { getQueryClient } from './client';

/**
 * Hand the request-scoped query cache to the client.
 *
 * Prefetch in the Server Component with `getQueryClient().prefetchQuery(...)`
 * (or `fetchQuery`), render this boundary around the client subtree, and the
 * client `useQuery` / `useSuspenseQuery` starts with the data, no refetch.
 * Reading request data (cookies) inside the prefetch makes the subtree
 * dynamic, so wrap the boundary in `<Suspense>` under Cache Components.
 */
export const HydrateQueries = ({ children }: { children: React.ReactNode }) => (
  <HydrationBoundary state={dehydrate(getQueryClient())}>{children}</HydrationBoundary>
);
