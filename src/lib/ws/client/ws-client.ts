import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';

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
import { wsErrorPayloadSchema, wsForceDisconnectPayloadSchema } from '../types/payloads.schema';
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
  /**
   * Subscriptions registered before the socket exists (lazy connect is async,
   * so `onEvent` can run before `connect()` finishes building the socket). They
   * are flushed onto the socket the moment it's created.
   */
  private readonly pendingSubscriptions = new Set<{
    event: keyof ServerToClientEvents;
    handler: ServerToClientEvents[keyof ServerToClientEvents];
  }>();

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
    const anonymous = options.anonymous ?? false;
    this.emitter.emit('connectStart', { anonymous });
    this.setStatus('connecting');

    // Cookie sessions are optimistic: the browser attaches the session cookie
    // to the handshake and the server rejects if it is missing. A custom
    // `auth` provider with nothing to send is the one case that fails fast.
    const provider = this.options.auth;
    if (!anonymous && provider && !(await buildHandshakeAuth({ anonymous, provider }))) {
      this.setStatus('disconnected');
      this.emitter.emit('error', {
        code: WS_LOCAL_ERROR_CODES.AUTH_REQUIRED,
        message:
          'connect() requires auth context from the configured provider, or anonymous: true.',
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
      // Callback form re-runs the auth provider on every (re)connect, so a
      // rotated token is picked up instead of replaying the one captured at
      // first connect. Cookie sessions send nothing; the browser jar still
      // attaches cookies to the handshake.
      auth: async (cb: (data: Record<string, unknown>) => void) => {
        cb((await buildHandshakeAuth({ anonymous, provider })) ?? {});
      },
      ...this.options.socketOptions,
    };

    this.teardownSocket();
    this.socket = io(url, socketOpts) as TypedSocket;
    this.flushPendingSubscriptions(this.socket);
    this.wireSocket(this.socket);
  }

  /**
   * Close the connection. The socket and all its listeners (Socket- and
   * Manager-level) are always torn down so a later `connect()` — which rebuilds
   * via `io()` regardless — can never leave an orphaned socket still holding
   * listeners or attempting reconnection. `permanent` is retained for API
   * compatibility; teardown is unconditional now.
   */
  disconnect(_options: { permanent?: boolean } = {}): void {
    this.stopHeartbeat();
    this.teardownSocket();
    this.setStatus('disconnected');
  }

  /**
   * Drop the current socket and every listener it owns. Socket-level listeners
   * live on the Socket emitter (`removeAllListeners`); the `connect`/reconnect
   * handlers wired via `socket.io.on(...)` live on the Manager, so both must be
   * cleared to avoid leaking listeners across connect/disconnect cycles.
   */
  private teardownSocket(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.io.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  // ── Event subscription (typed pass-through to socket.io-client) ────────────

  /** Subscribe to a server-emitted event. Returns an unsubscribe function. */
  onEvent<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E],
  ): () => void {
    // Lazy connect is async, so the socket may not exist yet on the first
    // subscriber. Buffer until connect() builds it, then flush.
    const entry = { event, handler } as {
      event: keyof ServerToClientEvents;
      handler: ServerToClientEvents[keyof ServerToClientEvents];
    };
    if (this.socket) {
      this.socket.on(event, handler as never);
    } else {
      this.pendingSubscriptions.add(entry);
    }
    return () => {
      this.pendingSubscriptions.delete(entry);
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

  private emitError(payload: WsErrorPayload): void {
    const parsed = wsErrorPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ event: 'error' }, 'WS dropped malformed payload');
      return;
    }
    this.emitter.emit('error', parsed.data);
  }

  private flushPendingSubscriptions(socket: TypedSocket): void {
    for (const { event, handler } of this.pendingSubscriptions) {
      socket.on(event as never, handler as never);
    }
    this.pendingSubscriptions.clear();
  }

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
      // event below. We reflect that here by choosing reconnecting vs disconnected.
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
      this.emitError(payload);
    });

    socket.on('auth:error', (payload: WsErrorPayload) => {
      this.emitError(payload);
    });

    socket.on('auth:force:disconnect', (payload: WsForceDisconnectPayload) => {
      const parsed = wsForceDisconnectPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        // Malformed force-disconnect → treat as fatal (non-reconnectable),
        // the safe default, rather than guessing.
        logger.warn({ event: 'auth:force:disconnect' }, 'WS dropped malformed payload');
        this.fatalDisconnect = true;
        if (this.socket) this.socket.io.opts.reconnection = false;
        return;
      }
      // Trust the server's `reconnectable` flag; the helper is only a
      // defensive cross-check for older servers that don't stamp it.
      const reconnectable = parsed.data.reconnectable ?? isReconnectableReason(parsed.data.reason);
      if (!reconnectable) {
        this.fatalDisconnect = true;
        if (this.socket) this.socket.io.opts.reconnection = false;
      }
      this.emitter.emit('forceDisconnect', { reason: parsed.data.reason, reconnectable });
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
