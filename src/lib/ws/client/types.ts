import type { ManagerOptions, SocketOptions } from 'socket.io-client';

import type { WsErrorPayload, WsForceDisconnectPayload } from '../types';

/** Returns the handshake `auth` payload, or `undefined` to send none. Runs on every (re)connect. */
export type WsAuthProvider = () => Promise<Record<string, string> | undefined>;

/** Connection status surface that flows into the Redux slice. */
export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WsClientOptions {
  /** WebSocket URL. Defaults to `getWsUrl(namespace)`. */
  url?: string;
  /** Server-side namespace path. Defaults to `WS_NAMESPACE` (`/ws`). */
  namespace?: string;
  /**
   * Override the socket.io-client options merge. Use sparingly — the
   * defaults (`transports: ['websocket']`, `withCredentials: true`, capped
   * exponential backoff) cover the common cases.
   */
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
  /**
   * Custom handshake auth. Omit for cookie sessions (the default): the
   * browser attaches the session cookie to the handshake itself.
   */
  auth?: WsAuthProvider;
}

export interface WsConnectOptions {
  /**
   * Connect without authentication. Whether the server admits the socket
   * is up to it; when admitted, only handlers the server marks public are
   * reachable. Default `false` — `connect()` rejects with `WS_AUTH_REQUIRED`
   * if there is no token / cookie context.
   */
  anonymous?: boolean;
}

/** Lifecycle events the bridge and hooks subscribe to. */
export interface WsLifecycleEvents {
  /** Fires when `connect()` starts building a socket, before any transport activity. */
  connectStart: (options: { anonymous: boolean }) => void;
  statusChange: (status: WsStatus, socketId: string | null) => void;
  error: (error: WsErrorPayload) => void;
  forceDisconnect: (payload: WsForceDisconnectPayload) => void;
  /** Fires once whenever a fresh socket id is assigned (on each connect). */
  socketIdChange: (socketId: string | null) => void;
  /** Fires on every successful application-level pong (after a `ping`). */
  pong: (timestamp: number) => void;
}

export type WsLifecycleEventName = keyof WsLifecycleEvents;
