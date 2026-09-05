/**
 * WebSocket transport constants.
 *
 * Tune locally only if you've changed the matching values on the server —
 * drift can cause socket-metadata TTLs to expire mid-connection.
 */

/** Default namespace mounted by the server's WS gateway. */
export const WS_NAMESPACE = '/ws';

/**
 * Application-level heartbeat interval. **Not** the engine.io ping.
 *
 * The client sends `ping` every 25 s so the server can refresh its
 * socket-metadata TTL and re-check any per-connection state. Keep this
 * strictly less than the server's socket TTL — otherwise the slot expires
 * between pings and the socket is silently disconnected.
 */
export const WS_HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Reconnection backoff bounds. Socket.IO doubles the delay on each attempt
 * up to the max. 1 s → 10 s is a sensible default for typical apps.
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
