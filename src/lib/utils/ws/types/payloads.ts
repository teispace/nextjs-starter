import type { WsDisconnectReason } from './disconnect-reason';

/**
 * Application or auth error payload. Mirrors `WsErrorPayload` in the
 * NestJS-starter backend and shares the same `{ key: message }` shape with
 * `ApiException.errors` from the HTTP layer.
 */
export interface WsErrorPayload {
  code: string;
  message: string;
  errors?: Record<string, string>[];
  /** Present only in development mode. */
  stack?: string;
}

export interface WsPresencePayload {
  userId: string;
  timestamp: number;
}

export interface WsPresenceStatusPayload {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: number;
}

export interface WsTokenRenewedPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Server-initiated disconnect. **Branch on `reconnectable`, not on `reason`.**
 * The boolean is the contract; the reason is for logging / UX.
 */
export interface WsForceDisconnectPayload {
  reason: WsDisconnectReason;
  reconnectable: boolean;
}

export interface WsPongPayload {
  timestamp: number;
}
