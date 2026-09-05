import type { WsLifecycleEventName, WsLifecycleEvents } from './types';

/**
 * Minimal typed event-emitter for lifecycle events. We don't expose the
 * underlying `Socket` instance to feature code — the bridge and hooks
 * subscribe to this emitter for status/error/disconnect transitions.
 *
 * Keeping the emitter internal means:
 * - Tests can assert lifecycle without a real socket.
 * - The Redux bridge is one subscription point, not many.
 * - Future internals changes (e.g. swapping socket.io-client for a custom
 *   transport) don't ripple through feature code.
 */
export class LifecycleEmitter {
  private readonly listeners = new Map<WsLifecycleEventName, Set<(...args: unknown[]) => void>>();

  on<E extends WsLifecycleEventName>(event: E, handler: WsLifecycleEvents[E]): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as (...args: unknown[]) => void);
    return () => this.off(event, handler);
  }

  off<E extends WsLifecycleEventName>(event: E, handler: WsLifecycleEvents[E]): void {
    this.listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends WsLifecycleEventName>(event: E, ...args: Parameters<WsLifecycleEvents[E]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy before iteration so handlers can off() themselves safely.
    for (const handler of [...set]) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
