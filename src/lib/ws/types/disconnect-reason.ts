/**
 * Server-issued disconnect reasons. Extend this map to match whatever
 * reasons the server may stamp on `auth:force:disconnect` payloads.
 *
 * Clients must branch on the payload's `reconnectable: boolean` flag
 * rather than on the reason string — the boolean is the contract; the
 * reason is for logging / UX. The mapping is centralised in
 * {@link isReconnectableReason} so it stays in one place if the policy
 * changes.
 */
export const WS_DISCONNECT_REASON = {
  SESSION_REVOKED: 'session_revoked',
  ROLES_CHANGED: 'roles_changed',
  MAX_CONNECTIONS: 'max_connections',
  SERVER_SHUTDOWN: 'server_shutdown',
  RATE_LIMITED: 'rate_limited',
  MAX_AGE: 'max_age',
} as const;

export type WsDisconnectReason = (typeof WS_DISCONNECT_REASON)[keyof typeof WS_DISCONNECT_REASON];

const RECONNECTABLE: ReadonlySet<WsDisconnectReason> = new Set([
  WS_DISCONNECT_REASON.SERVER_SHUTDOWN,
  WS_DISCONNECT_REASON.ROLES_CHANGED,
  WS_DISCONNECT_REASON.MAX_AGE,
]);

/**
 * Whether the client should transparently reconnect after the given reason.
 *
 * Use as a defensive fallback only — when the server stamps `reconnectable`
 * on the payload, that flag is the authoritative contract.
 */
export function isReconnectableReason(reason: WsDisconnectReason): boolean {
  return RECONNECTABLE.has(reason);
}
