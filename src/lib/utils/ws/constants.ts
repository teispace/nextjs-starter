/**
 * WebSocket transport constants.
 *
 * Mirrors the backend's documented defaults
 * (`nestjs-starter/docs/socket.md` §3, §15). Tune locally only if you've
 * changed the matching backend env vars — drift causes Redis TTLs to
 * expire mid-connection.
 */

/** Backend namespace mounted by `WsGateway`. */
export const WS_NAMESPACE = '/ws';

/**
 * Application-level heartbeat interval. **Not** the engine.io ping.
 *
 * The client sends `ping` every 25 s so the server refreshes the Redis
 * socket-metadata TTL (default 120 s server-side) and re-checks the
 * roles-version. Keep this strictly less than the server's
 * `WS_SOCKET_TTL_SECONDS` (default 120 s) — otherwise the slot expires
 * between pings and the socket is silently disconnected.
 */
export const WS_HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Schedule `auth:token:renew` this many ms before the access token expires.
 * The backend rate-limits renewals to 5 / min, so this margin must comfortably
 * exceed the typical request jitter (network blip + a one-shot retry).
 */
export const WS_TOKEN_RENEWAL_LEAD_MS = 60_000;

/**
 * Reconnection backoff bounds. Socket.IO doubles the delay on each attempt up
 * to the max. The backend recommends 1 s → 10 s for typical apps.
 */
export const WS_RECONNECTION_DELAY_MIN_MS = 1_000;
export const WS_RECONNECTION_DELAY_MAX_MS = 10_000;

/**
 * Connection error codes surfaced by the client when the failure is local
 * (not a payload from the server). These never collide with server error
 * codes because the server emits with structured payloads, not strings.
 */
export const WS_LOCAL_ERROR_CODES = {
  /** Connection attempted from a non-browser runtime. */
  SSR_BLOCKED: 'WS_SSR_BLOCKED',
  /** Connect called without auth context when `anonymous: false` (default). */
  AUTH_REQUIRED: 'WS_AUTH_REQUIRED',
  /** Transport closed by underlying socket.io-client (network, timeout). */
  TRANSPORT_ERROR: 'WS_TRANSPORT_ERROR',
} as const;
