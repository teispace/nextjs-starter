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
// RFC 6265 cookie-name token chars; anything else can't legally be a name.
const COOKIE_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
// Separators/quote chars that could splice extra cookies into the forwarded
// header. Control chars (incl. CR/LF) are checked separately by char code so
// the regex literal stays control-character-free.
const COOKIE_VALUE_SEPARATOR_RE = /["\\;,\s]/;

function hasIllegalCookieValueChar(value: string): boolean {
  if (COOKIE_VALUE_SEPARATOR_RE.test(value)) return true;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // C0 control chars (0x00–0x1F) and DEL (0x7F). `next/headers` returns
    // already-decoded values, so a malformed one would otherwise corrupt the
    // forwarded header.
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Forward only these cookie names to the upstream API. Leave empty to forward
 * all (current behavior). Populate with your API's auth cookie names to avoid
 * over-forwarding unrelated (e.g. analytics) cookies across origins.
 */
const FORWARD_COOKIE_ALLOWLIST: readonly string[] = [];

async function readServerCookieHeader(): Promise<string | undefined> {
  const all = (await cookies()).getAll();
  const allow = new Set(FORWARD_COOKIE_ALLOWLIST);
  const pairs = all.filter((c) => {
    if (allow.size > 0 && !allow.has(c.name)) return false;
    return COOKIE_NAME_RE.test(c.name) && !hasIllegalCookieValueChar(c.value);
  });
  if (pairs.length === 0) return undefined;
  return pairs.map((c) => `${c.name}=${c.value}`).join('; ');
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
