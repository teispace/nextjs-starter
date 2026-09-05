import { createBrowserRefresh } from './auth/browser-refresh';
import { redirectToLogin } from './auth/redirect';
import { createHttpClient } from './core/client';

/**
 * The universal HTTP client. Safe to import from Client Components, Server
 * Components, Route Handlers, and the proxy.
 *
 * In the browser the cookie jar carries the session and a 401 triggers one
 * same-origin refresh (`/api/auth/refresh`) followed by a single replay. On
 * the server it never refreshes and never forwards cookies; use
 * `@/lib/http/server` when a Server Component must act as the signed-in user.
 */
export const http = createHttpClient({
  auth: {
    refresh: createBrowserRefresh(),
    onUnauthorized: redirectToLogin,
  },
});
