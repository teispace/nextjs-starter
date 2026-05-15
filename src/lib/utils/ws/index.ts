// Public surface for the WebSocket layer. Feature code imports from here.
//
// The shared/ and client/internals/ paths are NOT exported — feature code
// should never touch them. If you need something not surfaced here, file a
// PR rather than reaching into the internals.

export {
  __resetWsClientForTests,
  createWsClient,
  WsClient,
  type WsClientOptions,
  type WsConnectOptions,
  type WsStatus,
  wsClient,
} from './client';
export {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_LOCAL_ERROR_CODES,
  WS_NAMESPACE,
  WS_RECONNECTION_DELAY_MAX_MS,
  WS_RECONNECTION_DELAY_MIN_MS,
  WS_TOKEN_RENEWAL_LEAD_MS,
} from './constants';
export { useWsEmit, useWsEvent, useWsStatus } from './hooks';
export {
  attachWsBridge,
  selectWsAnonymous,
  selectWsConnectedAt,
  selectWsForceDisconnectReason,
  selectWsIsConnected,
  selectWsIsDisconnectedFatally,
  selectWsLastError,
  selectWsReconnectable,
  selectWsSocketId,
  selectWsStatus,
} from './redux';
export {
  type ClientEventName,
  type ClientToServerEvents,
  isReconnectableReason,
  type ServerEventName,
  type ServerToClientEvents,
  WS_DISCONNECT_REASON,
  type WsDisconnectReason,
  type WsErrorPayload,
  type WsForceDisconnectPayload,
  type WsPongPayload,
  type WsPresencePayload,
  type WsPresenceStatusPayload,
  type WsTokenRenewedPayload,
} from './types';
