'use client';

import { useEffect, useRef } from 'react';

import { wsClient } from '../client';
import type { ServerToClientEvents } from '../types';

/**
 * Subscribe to a server-emitted WS event. Automatically attaches on mount,
 * detaches on unmount or when `event` changes. Triggers a lazy connect on
 * first subscriber so feature code never has to call `wsClient.connect()`
 * explicitly — but you can still call it yourself if you need to control
 * timing (e.g. wait for auth context).
 *
 * The handler is captured by ref so users can pass an inline arrow without
 * causing re-subscriptions on every render. Only `event` is a real
 * dependency.
 *
 * @example
 * ```tsx
 * useWsEvent('presence:online', ({ userId }) => {
 *   showToast(`${userId} is online`);
 * });
 * ```
 */
export function useWsEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // Lazy connect — does nothing if already connected/connecting.
    if (wsClient.getStatus() === 'idle') {
      void wsClient.connect().catch(() => {
        // Connect errors flow through the lifecycle emitter → Redux slice;
        // we don't need to surface them again at the hook boundary.
      });
    }

    const dispatch = ((...args: Parameters<ServerToClientEvents[E]>) => {
      // Typed cast — `handlerRef.current` is `ServerToClientEvents[E]`,
      // which is a function whose Parameters match `args` by construction.
      (handlerRef.current as (...a: Parameters<ServerToClientEvents[E]>) => void)(...args);
    }) as ServerToClientEvents[E];

    const unsubscribe = wsClient.onEvent(event, dispatch);
    return unsubscribe;
  }, [event]);
}
