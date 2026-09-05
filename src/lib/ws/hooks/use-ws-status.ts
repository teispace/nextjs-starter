'use client';

import { useAppSelector } from '@/store/hooks';

import {
  selectWsForceDisconnectReason,
  selectWsIsConnected,
  selectWsIsDisconnectedFatally,
  selectWsLastError,
  selectWsReconnectable,
  selectWsSocketId,
  selectWsStatus,
} from '../redux';

/**
 * Read-only window onto the WebSocket connection state.
 *
 * Returns the slice fields most consumers actually need, fanned out into
 * separate selectors so each component only re-renders when its own datum
 * changes. If you need bulk access, prefer composing the individual
 * selectors over reading the slice wholesale.
 */
export function useWsStatus() {
  return {
    status: useAppSelector(selectWsStatus),
    isConnected: useAppSelector(selectWsIsConnected),
    isDisconnectedFatally: useAppSelector(selectWsIsDisconnectedFatally),
    socketId: useAppSelector(selectWsSocketId),
    lastError: useAppSelector(selectWsLastError),
    forceDisconnectReason: useAppSelector(selectWsForceDisconnectReason),
    reconnectable: useAppSelector(selectWsReconnectable),
  };
}
