import type { AppDispatch } from '@/store';
import {
  wsConnectStarted,
  wsErrored,
  wsForceDisconnected,
  wsSocketIdChanged,
  wsStatusChanged,
} from '@/store/slices/ws.slice';

import type { WsClient } from '../client';

const attached = new WeakMap<WsClient, () => void>();

/**
 * Subscribe a Redux store to a `WsClient`'s lifecycle. The bridge is the
 * **only** code path that dispatches WS slice actions; feature code reads
 * state through selectors and never dispatches into the slice directly.
 *
 * Idempotent per client: attaching twice to the same client returns the
 * existing teardown instead of registering duplicate listeners. Mount it once
 * per store, from `StoreProvider`. Returns a teardown that unsubscribes.
 */
export function attachWsBridge(client: WsClient, dispatch: AppDispatch): () => void {
  const existing = attached.get(client);
  if (existing) return existing;

  const offs = [
    client.on('connectStart', ({ anonymous }) => {
      dispatch(wsConnectStarted({ anonymous }));
    }),
    client.on('statusChange', (status, socketId) => {
      dispatch(wsStatusChanged({ status, socketId }));
    }),
    client.on('socketIdChange', (socketId) => {
      dispatch(wsSocketIdChanged(socketId));
    }),
    client.on('error', (payload) => {
      dispatch(wsErrored(payload));
    }),
    client.on('forceDisconnect', ({ reason, reconnectable }) => {
      dispatch(wsForceDisconnected({ reason, reconnectable }));
    }),
  ];

  const teardown = () => {
    for (const off of offs) off();
    attached.delete(client);
  };
  attached.set(client, teardown);
  return teardown;
}
