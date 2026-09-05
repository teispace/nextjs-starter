import { axiosAdapter } from './adapters/axios';
import { createBrowserRefresh } from './auth/browser-refresh';
import { redirectToLogin } from './auth/redirect';
import { createHttpClient } from './core/client';

/**
 * The universal HTTP client, on the Axios transport. Behaviour is identical
 * to the fetch adapter (same core, same tests); Axios adds its interceptor
 * ecosystem for teams that rely on it. Server clients in `./server.ts` stay
 * on fetch so Next can observe and cache their requests.
 *
 * In the browser the cookie jar carries the session and a 401 triggers one
 * same-origin refresh (`/api/auth/refresh`) followed by a single replay. On
 * the server it never refreshes and never forwards cookies; use
 * `@/lib/http/server` when a Server Component must act as the signed-in user.
 */
export const http = createHttpClient({
  adapter: axiosAdapter(),
  auth: {
    refresh: createBrowserRefresh(),
    onUnauthorized: redirectToLogin,
  },
});
