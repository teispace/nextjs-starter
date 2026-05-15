import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { WsDisconnectReason, WsErrorPayload, WsStatus } from '@/lib/utils/ws';

/**
 * WebSocket **transport** state.
 *
 * Domain state (chat messages, notifications) belongs in feature slices,
 * not here. This slice tracks only the connection itself: status, last
 * error, force-disconnect reason, and the current socket id (for log
 * grepping).
 *
 * **Intentionally NOT persisted** — connection state across page reloads
 * is meaningless and would show stale info on first paint. Excluded from
 * `redux-persist` via the rootReducer composition.
 */
export interface WsState {
  status: WsStatus;
  socketId: string | null;
  /** Last application or auth error received. Cleared on next successful connect. */
  lastError: WsErrorPayload | null;
  /** Set when the server force-disconnects. Inspect alongside `reconnectable`. */
  forceDisconnectReason: WsDisconnectReason | null;
  /**
   * Mirror of the force-disconnect payload's `reconnectable` flag. `null`
   * means no force-disconnect has happened. `false` means the UI should
   * show "you were signed out" and route to login.
   */
  reconnectable: boolean | null;
  /** Unix ms of the most recent successful connect. */
  connectedAt: number | null;
  /**
   * Whether the most recent (or in-flight) connect was anonymous. Persisted
   * across reconnects so UI can tell apart "anonymous waiting for auth" from
   * "logged-out and disconnected."
   */
  anonymous: boolean;
}

const initialState: WsState = {
  status: 'idle',
  socketId: null,
  lastError: null,
  forceDisconnectReason: null,
  reconnectable: null,
  connectedAt: null,
  anonymous: false,
};

const wsSlice = createSlice({
  name: 'ws',
  initialState,
  reducers: {
    statusChanged: (
      state,
      action: PayloadAction<{ status: WsStatus; socketId: string | null }>,
    ) => {
      state.status = action.payload.status;
      state.socketId = action.payload.socketId;
      if (action.payload.status === 'connected') {
        state.connectedAt = Date.now();
        state.lastError = null;
        state.forceDisconnectReason = null;
        state.reconnectable = null;
      }
    },
    socketIdChanged: (state, action: PayloadAction<string | null>) => {
      state.socketId = action.payload;
    },
    errored: (state, action: PayloadAction<WsErrorPayload>) => {
      state.lastError = action.payload;
    },
    forceDisconnected: (
      state,
      action: PayloadAction<{ reason: WsDisconnectReason; reconnectable: boolean }>,
    ) => {
      state.forceDisconnectReason = action.payload.reason;
      state.reconnectable = action.payload.reconnectable;
    },
    connectStarted: (state, action: PayloadAction<{ anonymous: boolean }>) => {
      state.anonymous = action.payload.anonymous;
    },
    reset: () => initialState,
  },
});

export const {
  statusChanged: wsStatusChanged,
  socketIdChanged: wsSocketIdChanged,
  errored: wsErrored,
  forceDisconnected: wsForceDisconnected,
  connectStarted: wsConnectStarted,
  reset: wsReset,
} = wsSlice.actions;

export const wsReducer = wsSlice.reducer;
export { wsSlice };
