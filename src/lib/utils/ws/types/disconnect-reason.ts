/**
 * Server-issued disconnect reasons, mirroring
 * `WS_DISCONNECT_REASON` in the NestJS-starter backend
 * (`src/infrastructure/websocket/websocket.constants.ts`).
 *
 * Clients must branch on the payload's `reconnectable: boolean` flag rather
 * than on the reason string — the boolean is the contract; the reason is
 * for logging / UX. The mapping is centralised in
 * {@link isReconnectableReason} so it stays in sync if the backend adjusts
 * the policy.
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
 * Use as a defensive fallback only — the server stamps `reconnectable` on
 * the payload, and that is the authoritative contract.
 */
export function isReconnectableReason(reason: WsDisconnectReason): boolean {
  return RECONNECTABLE.has(reason);
}
