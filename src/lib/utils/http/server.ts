import 'server-only';

import { cookies } from 'next/headers';

import { createAxiosClient } from './axios-client';
import { handleUnauthorizedRedirect } from './client-utils';
import { createFetchClient } from './fetch-client';
import { secureStorageTokenStore } from './token-store';

/**
 * **Server-only HTTP clients.** Use these from Server Components, Server
 * Actions, and Route Handlers when you need HttpOnly auth cookies to flow
 * to the upstream request.
 *
 * The universal `@/lib/utils/http` entry doesn't forward cookies — in the
 * browser the cookie jar handles it natively, but on the server there's
 * no jar and we'd have to read `next/headers` ourselves. Reading
 * `next/headers` from a module reachable by client bundles is a build
 * error, so the server-side cookie forwarding lives here, behind the
 * `'server-only'` fence.
 *
 * Importing this module from a `'use client'` file fails the build with a
 * clear error from the `server-only` package. That's the design — it
 * forces consumers to be explicit about which runtime they're targeting.
 *
 * ```ts
 * // app/[locale]/profile/page.tsx (Server Component)
 * import { fetchClient } from '@/lib/utils/http/server';
 *
 * const result = await fetchClient.get<User>('/auth/me');  // sends cookies
 * ```
 *
 * For client-component or universal usage:
 * ```ts
 * import { fetchClient } from '@/lib/utils/http';  // browser cookie jar
 * ```
 */
async function readServerCookieHeader(): Promise<string | undefined> {
  const all = (await cookies()).getAll();
  if (all.length === 0) return undefined;
  return all.map((c) => `${c.name}=${c.value}`).join('; ');
}

export const fetchClient = createFetchClient({
  tokenStore: secureStorageTokenStore,
  onUnauthorized: handleUnauthorizedRedirect,
  cache: 'no-store',
  cookieResolver: readServerCookieHeader,
});

export const axiosClient = createAxiosClient({
  tokenStore: secureStorageTokenStore,
  onUnauthorized: handleUnauthorizedRedirect,
  cookieResolver: readServerCookieHeader,
});

// Re-export the factories so consumers can build custom server-mode
// clients with the cookie resolver pre-wired.
export { createAxiosClient, createFetchClient };
