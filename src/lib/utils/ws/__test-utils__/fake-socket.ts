import { vi } from 'vitest';

/**
 * Minimal socket.io-client surface mock. Drives `WsClient` through its
 * lifecycle without opening a real WebSocket. Lifecycle calls are exposed
 * as `simulate*` methods so tests can be explicit about what they're
 * triggering.
 */
export class FakeSocket {
  id: string | null = 'fake-socket-id';
  connected = false;

  private readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private readonly managerListeners = new Map<string, Set<(...args: unknown[]) => void>>();

  readonly io = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      let set = this.managerListeners.get(event);
      if (!set) {
        set = new Set();
        this.managerListeners.set(event, set);
      }
      set.add(handler);
      return this.io;
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this.managerListeners.get(event)?.delete(handler);
      return this.io;
    }),
    opts: { reconnection: true } as { reconnection: boolean },
  };

  on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return this;
  });

  off = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    this.listeners.get(event)?.delete(handler);
    return this;
  });

  emit = vi.fn((..._args: unknown[]) => this);
  removeAllListeners = vi.fn();
  disconnect = vi.fn(() => {
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
    return this;
  });

  // ── Test-side drivers ─────────────────────────────────────────────────────

  simulateConnect(): void {
    this.connected = true;
    this.fire('connect');
  }

  simulateDisconnect(reason = 'transport close'): void {
    this.connected = false;
    this.fire('disconnect', reason);
  }

  simulateServerEvent(event: string, ...args: unknown[]): void {
    this.fire(event, ...args);
  }

  simulateManagerEvent(event: string, ...args: unknown[]): void {
    const set = this.managerListeners.get(event);
    if (!set) return;
    for (const h of [...set]) h(...args);
  }

  private fire(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of [...set]) h(...args);
  }
}
