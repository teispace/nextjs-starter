import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeSocket } from '../__test-utils__/fake-socket';
import { WS_DISCONNECT_REASON } from '../types';
import { WsClient } from './ws-client';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const SAVE_AUTH_TOKENS = { value: false };
vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
  return {
    ...actual,
    get SAVE_AUTH_TOKENS() {
      return SAVE_AUTH_TOKENS.value;
    },
  };
});

// Mock socket.io-client's `io` factory to return our FakeSocket.
let fakeSocket: FakeSocket;
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}));

describe('WsClient', () => {
  beforeEach(() => {
    fakeSocket = new FakeSocket();
    SAVE_AUTH_TOKENS.value = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('connect()', () => {
    it('transitions idle → connecting → connected', async () => {
      const client = new WsClient();
      const statuses: string[] = [];
      client.on('statusChange', (s) => statuses.push(s));

      await client.connect();
      expect(statuses).toEqual(['connecting']);

      fakeSocket.simulateConnect();
      expect(statuses).toEqual(['connecting', 'connected']);
      expect(client.isConnected()).toBe(true);
      expect(client.getSocketId()).toBe('fake-socket-id');
    });

    it('is idempotent — second call while connecting is a no-op', async () => {
      const client = new WsClient();
      await client.connect();
      const ioMock = (await import('socket.io-client')).io;
      const firstCount = vi.mocked(ioMock).mock.calls.length;

      await client.connect();
      expect(vi.mocked(ioMock).mock.calls.length).toBe(firstCount);
    });

    it('refuses without auth context in bearer mode and emits AUTH_REQUIRED', async () => {
      SAVE_AUTH_TOKENS.value = true;
      // No token stored — buildHandshakeAuth returns undefined.
      const client = new WsClient();
      const errors: unknown[] = [];
      client.on('error', (e) => errors.push(e));

      await expect(client.connect()).rejects.toThrow(/AUTH_REQUIRED|authentication context/);
      expect(errors).toHaveLength(1);
      expect((errors[0] as { code: string }).code).toBe('WS_AUTH_REQUIRED');
    });

    it('allows anonymous connect even without auth', async () => {
      SAVE_AUTH_TOKENS.value = true;
      const client = new WsClient();
      await expect(client.connect({ anonymous: true })).resolves.toBeUndefined();
      fakeSocket.simulateConnect();
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('heartbeat', () => {
    it('emits ping every WS_HEARTBEAT_INTERVAL_MS while connected', async () => {
      const client = new WsClient();
      await client.connect();
      fakeSocket.simulateConnect();

      vi.advanceTimersByTime(25_000);
      expect(fakeSocket.emit).toHaveBeenCalledWith('ping');

      vi.advanceTimersByTime(25_000);
      expect(fakeSocket.emit).toHaveBeenCalledTimes(2);
    });

    it('stops on disconnect', async () => {
      const client = new WsClient();
      await client.connect();
      fakeSocket.simulateConnect();

      fakeSocket.simulateDisconnect();
      vi.advanceTimersByTime(60_000);
      expect(fakeSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('reconnection lifecycle', () => {
    it('transport-close disconnect → status becomes reconnecting', async () => {
      const client = new WsClient();
      const statuses: string[] = [];
      client.on('statusChange', (s) => statuses.push(s));

      await client.connect();
      fakeSocket.simulateConnect();
      fakeSocket.simulateDisconnect('transport close');

      expect(statuses).toContain('reconnecting');
    });

    it('explicit client disconnect → status becomes disconnected (no reconnect)', async () => {
      const client = new WsClient();
      const statuses: string[] = [];
      client.on('statusChange', (s) => statuses.push(s));

      await client.connect();
      fakeSocket.simulateConnect();
      client.disconnect();

      expect(statuses[statuses.length - 1]).toBe('disconnected');
    });
  });

  describe('auth:force:disconnect', () => {
    it('non-reconnectable reason latches fatalDisconnect and disables reconnection', async () => {
      const client = new WsClient();
      const events: unknown[] = [];
      client.on('forceDisconnect', (p) => events.push(p));

      await client.connect();
      fakeSocket.simulateConnect();

      fakeSocket.simulateServerEvent('auth:force:disconnect', {
        reason: WS_DISCONNECT_REASON.SESSION_REVOKED,
        reconnectable: false,
      });

      expect(events).toHaveLength(1);
      expect(fakeSocket.io.opts.reconnection).toBe(false);

      // A subsequent transport close should NOT flip to reconnecting.
      const statuses: string[] = [];
      client.on('statusChange', (s) => statuses.push(s));
      fakeSocket.simulateDisconnect('transport close');
      expect(statuses).toEqual(['disconnected']);
    });

    it('reconnectable reason leaves auto-reconnect untouched', async () => {
      const client = new WsClient();
      await client.connect();
      fakeSocket.simulateConnect();

      fakeSocket.simulateServerEvent('auth:force:disconnect', {
        reason: WS_DISCONNECT_REASON.ROLES_CHANGED,
        reconnectable: true,
      });

      expect(fakeSocket.io.opts.reconnection).toBe(true);
    });

    it('back-compat: missing `reconnectable` falls back to isReconnectableReason()', async () => {
      const client = new WsClient();
      const events: { reconnectable: boolean }[] = [];
      client.on('forceDisconnect', (p) => events.push(p));

      await client.connect();
      fakeSocket.simulateConnect();

      // Simulate an older server that didn't stamp `reconnectable`.
      fakeSocket.simulateServerEvent('auth:force:disconnect', {
        reason: WS_DISCONNECT_REASON.SERVER_SHUTDOWN,
      });

      expect(events[0].reconnectable).toBe(true);
    });

    it('treats a malformed force-disconnect payload as fatal (no emit, reconnection disabled)', async () => {
      const client = new WsClient();
      const events: unknown[] = [];
      client.on('forceDisconnect', (p) => events.push(p));

      await client.connect();
      fakeSocket.simulateConnect();

      // Unknown reason — fails the zod enum.
      fakeSocket.simulateServerEvent('auth:force:disconnect', { reason: 'not_a_real_reason' });

      expect(events).toHaveLength(0);
      expect(fakeSocket.io.opts.reconnection).toBe(false);
    });
  });

  describe('onEvent buffering (lazy connect)', () => {
    it('does not throw when called before the socket exists, and wires the buffered event on connect', async () => {
      const client = new WsClient();
      const handler = vi.fn();

      // Subscribe BEFORE connect() — the socket is still null at this point.
      expect(() => client.onEvent('presence:online', handler)).not.toThrow();

      await client.connect();
      fakeSocket.simulateConnect();
      fakeSocket.simulateServerEvent('presence:online', { userId: 'u1', timestamp: 1 });

      expect(handler).toHaveBeenCalledWith({ userId: 'u1', timestamp: 1 });
    });

    it('unsubscribing a buffered event before connect prevents it from wiring', async () => {
      const client = new WsClient();
      const handler = vi.fn();

      const unsubscribe = client.onEvent('presence:online', handler);
      unsubscribe();

      await client.connect();
      fakeSocket.simulateConnect();
      fakeSocket.simulateServerEvent('presence:online', { userId: 'u1', timestamp: 1 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('socket teardown', () => {
    it('clears both Socket- and Manager-level listeners on disconnect', async () => {
      const client = new WsClient();
      await client.connect();
      fakeSocket.simulateConnect();

      client.disconnect();

      expect(fakeSocket.removeAllListeners).toHaveBeenCalled();
      expect(fakeSocket.io.removeAllListeners).toHaveBeenCalled();
    });

    it('tears down the previous socket before building a new one on reconnect', async () => {
      const client = new WsClient();
      await client.connect();
      const firstSocket = fakeSocket;
      fakeSocket.simulateConnect();

      client.disconnect();
      // New socket for the next connect.
      fakeSocket = new FakeSocket();
      await client.connect();

      expect(firstSocket.removeAllListeners).toHaveBeenCalled();
      expect(firstSocket.io.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('error pass-through', () => {
    it('forwards server `error` events to the lifecycle emitter', async () => {
      const client = new WsClient();
      const errors: unknown[] = [];
      client.on('error', (e) => errors.push(e));

      await client.connect();
      fakeSocket.simulateConnect();
      fakeSocket.simulateServerEvent('error', { code: 'BAD', message: 'boom' });

      expect(errors).toEqual([{ code: 'BAD', message: 'boom' }]);
    });

    it('translates manager-level transport errors to WS_TRANSPORT_ERROR', async () => {
      const client = new WsClient();
      const errors: { code: string }[] = [];
      client.on('error', (e) => errors.push(e));

      await client.connect();
      fakeSocket.simulateManagerEvent('error', new Error('econnreset'));

      expect(errors[0].code).toBe('WS_TRANSPORT_ERROR');
    });
  });

  describe('emit', () => {
    it('returns false when socket is not connected', async () => {
      const client = new WsClient();
      // emit's typed signature requires a known event; ping has an optional ack arg.
      expect(client.emit('ping')).toBe(false);

      await client.connect();
      expect(client.emit('ping')).toBe(false); // still connecting
      fakeSocket.simulateConnect();
      expect(client.emit('ping')).toBe(true);
    });
  });

  describe('SSR guard', () => {
    it('throws WsSsrError when called server-side', async () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — deleting for SSR simulation
      delete globalThis.window;
      try {
        const client = new WsClient();
        await expect(client.connect()).rejects.toThrow(/server context/);
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});
