import type { ManagerOptions, SocketOptions } from 'socket.io-client';

import type { WsErrorPayload, WsForceDisconnectPayload } from '../types';

/** Connection status surface mirrored into the Redux slice. */
export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WsClientOptions {
  /** WebSocket URL. Defaults to `getWsUrl(namespace)`. */
  url?: string;
  /** Backend namespace path. Defaults to `WS_NAMESPACE` (`/ws`). */
  namespace?: string;
  /**
   * Override the socket.io-client options merge. Use sparingly — the
   * defaults match the backend's documented requirements (`transports:
   * ['websocket']`, `withCredentials: true`, capped exponential backoff).
   */
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
}

export interface WsConnectOptions {
  /**
   * Connect without authentication. The backend allows it, but only
   * `@WsPublic()` handlers are reachable. Use for landing-page presence
   * widgets, public dashboards, etc. Default `false` — `connect()` rejects
   * with `WS_AUTH_REQUIRED` if there is no token / cookie context.
   */
  anonymous?: boolean;
}

/** Lifecycle events the bridge and hooks subscribe to. */
export interface WsLifecycleEvents {
  statusChange: (status: WsStatus, socketId: string | null) => void;
  error: (error: WsErrorPayload) => void;
  forceDisconnect: (payload: WsForceDisconnectPayload) => void;
  /** Fires once whenever a fresh socket id is assigned (on each connect). */
  socketIdChange: (socketId: string | null) => void;
  /** Fires on every successful application-level pong (after a `ping`). */
  pong: (timestamp: number) => void;
}

export type WsLifecycleEventName = keyof WsLifecycleEvents;
