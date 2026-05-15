import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';

import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { logger } from '@/lib/logger';

import {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_LOCAL_ERROR_CODES,
  WS_RECONNECTION_DELAY_MAX_MS,
  WS_RECONNECTION_DELAY_MIN_MS,
} from '../constants';
import { buildHandshakeAuth, ensureBrowser, getWsUrl } from '../shared';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  WsErrorPayload,
  WsForceDisconnectPayload,
} from '../types';
import { isReconnectableReason } from '../types';
import { LifecycleEmitter } from './lifecycle-emitter';
import type { WsClientOptions, WsConnectOptions, WsStatus } from './types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Stateful WebSocket client wrapping `socket.io-client`. One instance owns
 * one underlying `Socket`. Designed as a singleton per namespace (use
 * {@link createWsClient} for additional namespaces).
 *
 * **Lifecycle is event-driven, not promise-driven.** Subscribe to status
 * changes via the lifecycle emitter (the Redux bridge does this for you).
 * Connection happens lazily on first `connect()` or on first subscriber via
 * `useWsEvent`.
 *
 * Force-disconnect with `reconnectable: false` (session revoked, etc.)
 * marks the client `disconnected` and refuses to auto-reconnect. Call
 * `connect()` again explicitly after the user re-authenticates.
 */
export class WsClient {
  private readonly options: WsClientOptions;
  private readonly emitter = new LifecycleEmitter();

  private socket: TypedSocket | null = null;
  private status: WsStatus = 'idle';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /** Set when force-disconnect tells us not to reconnect. Cleared on next explicit connect(). */
  private fatalDisconnect = false;

  constructor(options: WsClientOptions = {}) {
    this.options = options;
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  getStatus(): WsStatus {
    return this.status;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  on = this.emitter.on.bind(this.emitter);
  off = this.emitter.off.bind(this.emitter);

  // ── Connect / disconnect ────────────────────────────────────────────────────

  /**
   * Open the connection. Idempotent — calling on an already-connected (or
   * connecting) socket is a no-op. Resets the `fatalDisconnect` latch so
   * the caller can explicitly reconnect after a denial.
   */
  async connect(options: WsConnectOptions = {}): Promise<void> {
    ensureBrowser('connect');
    if (this.socket && this.status !== 'idle' && this.status !== 'disconnected') {
      return;
    }

    this.fatalDisconnect = false;
    this.setStatus('connecting');

    const anonymous = options.anonymous ?? false;
    const auth = await buildHandshakeAuth({ anonymous });

    // Cookie mode (SAVE_AUTH_TOKENS=false) is always optimistic — the browser
    // jar carries the access cookie automatically and the server rejects if
    // it's missing. Bearer mode with no stored token (auth === undefined and
    // not anonymous) is the one combination that should fail fast.
    if (!anonymous && SAVE_AUTH_TOKENS && !auth) {
      this.setStatus('disconnected');
      this.emitter.emit('error', {
        code: WS_LOCAL_ERROR_CODES.AUTH_REQUIRED,
        message: 'connect() requires either an auth token or anonymous: true.',
      });
      throw new Error('[ws] connect() requires authentication context or anonymous: true.');
    }

    const url = this.options.url ?? getWsUrl(this.options.namespace);
    const socketOpts: Partial<ManagerOptions & SocketOptions> = {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: WS_RECONNECTION_DELAY_MIN_MS,
      reconnectionDelayMax: WS_RECONNECTION_DELAY_MAX_MS,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      auth,
      ...this.options.socketOptions,
    };

    this.socket = io(url, socketOpts) as TypedSocket;
    this.wireSocket(this.socket);
  }

  /**
   * Close the connection. Use for logout flows where the caller wants to
   * stop reconnection too — pass `{ permanent: true }` to also clear the
   * underlying Manager so subsequent `connect()` builds a fresh one.
   */
  disconnect(options: { permanent?: boolean } = {}): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (!this.socket) {
      this.setStatus('disconnected');
      return;
    }

    this.socket.disconnect();
    if (options.permanent) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  // ── Event subscription (typed pass-through to socket.io-client) ────────────

  /** Subscribe to a server-emitted event. Returns an unsubscribe function. */
  onEvent<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E],
  ): () => void {
    if (!this.socket) {
      // Buffer would add complexity; instead require connect() first.
      // The hooks call connect() lazily before subscribing, so feature
      // code never hits this path.
      throw new Error('[ws] onEvent() called before connect(). Call connect() first.');
    }
    this.socket.on(event, handler as never);
    return () => {
      this.socket?.off(event, handler as never);
    };
  }

  /** Emit a client→server event. Returns true if dispatched (socket open). */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): boolean {
    if (!this.socket?.connected) return false;
    // socket.io-client's `emit` signature is hostile to generics; the cast
    // is safe because `args` is statically typed as the expected tuple.
    (this.socket.emit as (event: string, ...args: unknown[]) => void)(event, ...args);
    return true;
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private wireSocket(socket: TypedSocket): void {
    socket.on('connect', () => {
      this.setStatus('connected');
      this.emitter.emit('socketIdChange', socket.id ?? null);
      this.startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      this.stopHeartbeat();
      // socket.io-client auto-reconnects for `transport close`, `ping timeout`,
      // and network errors. For explicit server-side disconnects (`io server
      // disconnect`) it does not — those are handled by the force-disconnect
      // event below. We mirror that by setting reconnecting vs disconnected.
      if (this.fatalDisconnect) {
        this.setStatus('disconnected');
        return;
      }
      const willReconnect = reason !== 'io client disconnect' && reason !== 'io server disconnect';
      this.setStatus(willReconnect ? 'reconnecting' : 'disconnected');
      this.emitter.emit('socketIdChange', null);
    });

    socket.io.on('reconnect_attempt', () => {
      if (!this.fatalDisconnect) this.setStatus('reconnecting');
    });

    socket.io.on('error', (err) => {
      logger.warn({ err: err.message }, 'WS transport error');
      this.emitter.emit('error', {
        code: WS_LOCAL_ERROR_CODES.TRANSPORT_ERROR,
        message: err.message || 'WebSocket transport error',
      });
    });

    socket.on('error', (payload: WsErrorPayload) => {
      this.emitter.emit('error', payload);
    });

    socket.on('auth:error', (payload: WsErrorPayload) => {
      this.emitter.emit('error', payload);
    });

    socket.on('auth:force:disconnect', (payload: WsForceDisconnectPayload) => {
      // Trust the server's `reconnectable` flag; the helper is only a
      // defensive cross-check for clients running against an older backend.
      const reconnectable = payload.reconnectable ?? isReconnectableReason(payload.reason);
      if (!reconnectable) {
        this.fatalDisconnect = true;
        if (this.socket) this.socket.io.opts.reconnection = false;
      }
      this.emitter.emit('forceDisconnect', { ...payload, reconnectable });
    });

    socket.on('pong', (payload) => {
      this.emitter.emit('pong', payload.timestamp);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) this.socket.emit('ping');
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(next: WsStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.emitter.emit('statusChange', next, this.socket?.id ?? null);
  }
}

export function createWsClient(options: WsClientOptions = {}): WsClient {
  return new WsClient(options);
}
