'use client';

import { useCallback } from 'react';

import { wsClient } from '../client';
import type { ClientToServerEvents } from '../types';

/**
 * Typed `emit` accessor. Returns a stable function whose signature is
 * inferred from {@link ClientToServerEvents} — pick an event name and the
 * compiler enforces the payload shape.
 *
 * Returns `false` if the socket isn't connected yet. Callers that need
 * delivery confirmation should subscribe to the server's ack-bearing
 * events (`auth:token:renew` has an ack) or use a server→client follow-up
 * event.
 *
 * @example
 * ```tsx
 * const emit = useWsEmit();
 * emit('presence:subscribe', { userId: '...' });
 * ```
 */
export function useWsEmit() {
  return useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ): boolean => wsClient.emit(event, ...args),
    [],
  );
}
