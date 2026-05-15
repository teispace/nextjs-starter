import 'server-only';

import { cookies } from 'next/headers';

/**
 * Serialise the incoming request's cookies into a single `Cookie` header
 * suitable for forwarding to the backend from a Server Component, Server
 * Action, or Route Handler.
 *
 * `credentials: 'include'` (fetch) and `withCredentials: true` (axios) are
 * browser-only concepts; on the server there is no cookie jar, so the
 * backend's HttpOnly session cookies never reach it unless we attach them
 * explicitly. This helper is the only place that touches `next/headers` —
 * the `server-only` import prevents accidental client-component usage.
 */
export async function readServerCookieHeader(): Promise<string> {
  const all = (await cookies()).getAll();
  if (all.length === 0) return '';
  return all.map((c) => `${c.name}=${c.value}`).join('; ');
}
