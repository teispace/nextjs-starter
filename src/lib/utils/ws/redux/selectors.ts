import type { AppState } from '@/store';

const selectWs = (state: AppState) => state.ws;

export const selectWsStatus = (state: AppState) => selectWs(state).status;
export const selectWsSocketId = (state: AppState) => selectWs(state).socketId;
export const selectWsLastError = (state: AppState) => selectWs(state).lastError;
export const selectWsForceDisconnectReason = (state: AppState) =>
  selectWs(state).forceDisconnectReason;
export const selectWsReconnectable = (state: AppState) => selectWs(state).reconnectable;
export const selectWsConnectedAt = (state: AppState) => selectWs(state).connectedAt;
export const selectWsAnonymous = (state: AppState) => selectWs(state).anonymous;

/** True when the socket is fully connected. */
export const selectWsIsConnected = (state: AppState) => selectWs(state).status === 'connected';

/**
 * True when the server told us not to reconnect (session revoked, max
 * connections, rate limited). UI should treat this as "signed out" and
 * stop trying to re-establish on its own.
 */
export const selectWsIsDisconnectedFatally = (state: AppState) => {
  const ws = selectWs(state);
  return ws.status === 'disconnected' && ws.reconnectable === false;
};
