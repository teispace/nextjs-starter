import type { AppDispatch } from '@/store';
import {
  wsErrored,
  wsForceDisconnected,
  wsSocketIdChanged,
  wsStatusChanged,
} from '@/store/slices/ws.slice';

import type { WsClient } from '../client';

/**
 * Subscribe a Redux store to a `WsClient`'s lifecycle. Idempotent — calling
 * twice returns the same teardown closure. The bridge is the **only** code
 * path that ever dispatches WS slice actions; feature code reads state via
 * selectors and never dispatches into this slice directly.
 *
 * Mount once per app, typically inside `StoreProvider` after the store is
 * built. Returns a teardown function that unsubscribes every handler.
 */
export function attachWsBridge(client: WsClient, dispatch: AppDispatch): () => void {
  const offStatus = client.on('statusChange', (status, socketId) => {
    dispatch(wsStatusChanged({ status, socketId }));
  });

  const offSocketId = client.on('socketIdChange', (socketId) => {
    dispatch(wsSocketIdChanged(socketId));
  });

  const offError = client.on('error', (payload) => {
    dispatch(wsErrored(payload));
  });

  const offForce = client.on('forceDisconnect', ({ reason, reconnectable }) => {
    dispatch(wsForceDisconnected({ reason, reconnectable }));
  });

  return () => {
    offStatus();
    offSocketId();
    offError();
    offForce();
  };
}
