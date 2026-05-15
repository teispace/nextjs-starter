import type {
  WsErrorPayload,
  WsForceDisconnectPayload,
  WsPongPayload,
  WsPresencePayload,
  WsPresenceStatusPayload,
  WsTokenRenewedPayload,
} from './payloads';

/**
 * Events the **client** sends to the server.
 *
 * Mirrors `ClientToServerEvents` in the NestJS-starter backend
 * (`src/infrastructure/websocket/types/ws-events.interface.ts`). Keep these
 * field-for-field aligned — the server's typed gateway will not deliver any
 * event not declared in its map, and silent drift will fail at runtime
 * rather than at compile time.
 *
 * Extend this interface in your own feature folders via TypeScript
 * declaration merging if you add custom client→server events to a gateway:
 *
 * ```ts
 * // src/features/chat/types/ws-events.ts
 * declare module '@/lib/utils/ws' {
 *   interface ClientToServerEvents {
 *     'message:send': (payload: { roomId: string; content: string }) => void;
 *   }
 * }
 * ```
 */
export interface ClientToServerEvents {
  ping: (ack?: () => void) => void;
  'auth:token:renew': (
    payload: { refreshToken: string },
    ack?: (result: { success: boolean; error?: WsErrorPayload }) => void,
  ) => void;
  'presence:subscribe': (payload: { userId: string }) => void;
  'presence:unsubscribe': (payload: { userId: string }) => void;
}

/**
 * Events the **server** sends to the client.
 *
 * Same alignment rule as {@link ClientToServerEvents}. Subscribe to these
 * via `useWsEvent(event, handler)` — the handler argument is inferred from
 * this interface, no manual casting required.
 */
export interface ServerToClientEvents {
  pong: (payload: WsPongPayload) => void;
  error: (payload: WsErrorPayload) => void;
  'auth:error': (payload: WsErrorPayload) => void;
  'auth:token:renewed': (payload: WsTokenRenewedPayload) => void;
  'auth:force:disconnect': (payload: WsForceDisconnectPayload) => void;
  'presence:online': (payload: WsPresencePayload) => void;
  'presence:offline': (payload: WsPresencePayload) => void;
  'presence:status': (payload: WsPresenceStatusPayload) => void;
}

/** Union of every event name the server can emit. */
export type ServerEventName = keyof ServerToClientEvents;

/** Union of every event name the client can emit. */
export type ClientEventName = keyof ClientToServerEvents;
