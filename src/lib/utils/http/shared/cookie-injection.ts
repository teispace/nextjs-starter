import { isBrowser } from './runtime';

/**
 * Returns the `Cookie` header value to inject on outgoing requests, or
 * `undefined` when no injection is needed.
 *
 * - **Browser:** returns `undefined`. The browser cookie jar attaches
 *   cookies automatically when the request runs with `credentials: 'include'`
 *   (fetch) or `withCredentials: true` (axios).
 * - **Server (RSC / Server Action / Route Handler):** dynamically imports
 *   the `server-only` helper to read `next/headers` and serialise the
 *   incoming request's cookies. The dynamic import keeps `next/headers`
 *   (and its `server-only` guard) out of the client bundle.
 */
export async function getCookieHeaderForRequest(): Promise<string | undefined> {
  if (isBrowser()) return undefined;

  const { readServerCookieHeader } = await import('./server-cookies');
  const header = await readServerCookieHeader();
  return header || undefined;
}
