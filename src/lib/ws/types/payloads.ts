import type { WsDisconnectReason } from './disconnect-reason';

/**
 * Application or auth error payload. Shares the same `{ key: message }`
 * shape used by `HttpError.errors` in the HTTP layer so error rendering
 * stays uniform across transports.
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
