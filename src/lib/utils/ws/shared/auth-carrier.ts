import { SAVE_AUTH_TOKENS } from '@/lib/config';

// Import from the leaf module, NOT the http barrel: the barrel transitively
// pulls in `shared/cookie-injection` and `shared/server-cookies`, which
// Turbopack flags as a `next/headers` import inside the client bundle.
// The leaf only depends on `SecureStorageService`.
import { secureStorageTokenStore } from '../../http/token-store';

/**
 * Build the Socket.IO `auth` payload for the handshake.
 *
 * Mode selection follows the same `SAVE_AUTH_TOKENS` lever as the HTTP layer:
 *
 * - **Cookie-mode** (`SAVE_AUTH_TOKENS = false`, default) — return `undefined`.
 *   The browser cookie jar attaches the `access` HttpOnly cookie on the
 *   handshake automatically (Socket.IO's transport is a regular WS upgrade
 *   from an HTTP request, so cookies flow when `withCredentials` is set).
 *
 * - **Bearer-mode** (`SAVE_AUTH_TOKENS = true`) — return
 *   `{ token: <accessToken> }`. Most server-side token extractors accept
 *   `handshake.auth.token` with highest priority.
 *
 * - **Anonymous** (caller passed `anonymous: true`) — return `undefined`,
 *   skipping both branches. The server falls into its anonymous-connection
 *   path (only public handlers are reachable).
 *
 * Returning `undefined` is **the right shape** for socket.io-client — it
 * leaves the `auth` field unset on the handshake rather than sending an
 * empty object.
 */
export async function buildHandshakeAuth(options: {
  anonymous: boolean;
}): Promise<Record<string, string> | undefined> {
  if (options.anonymous) return undefined;

  if (!SAVE_AUTH_TOKENS) {
    // Cookie path — the browser attaches `access` automatically. The server
    // reads it from `handshake.headers.cookie`.
    return undefined;
  }

  const token = await secureStorageTokenStore.getAccessToken();
  if (!token) return undefined;
  return { token };
}
