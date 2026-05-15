import { describe, expect, it } from 'vitest';

import { WS_DISCONNECT_REASON } from '@/lib/utils/ws';

import {
  wsConnectStarted,
  wsErrored,
  wsForceDisconnected,
  wsReducer,
  wsReset,
  wsStatusChanged,
} from './ws.slice';

const initial = wsReducer(undefined, { type: '@@INIT' });

describe('ws slice', () => {
  it('defaults to idle / null fields', () => {
    expect(initial.status).toBe('idle');
    expect(initial.socketId).toBeNull();
    expect(initial.lastError).toBeNull();
    expect(initial.forceDisconnectReason).toBeNull();
    expect(initial.reconnectable).toBeNull();
    expect(initial.connectedAt).toBeNull();
    expect(initial.anonymous).toBe(false);
  });

  it('statusChanged → connected stamps connectedAt and clears error / force fields', () => {
    const dirty = wsReducer(
      {
        ...initial,
        lastError: { code: 'X', message: 'x' },
        forceDisconnectReason: WS_DISCONNECT_REASON.SESSION_REVOKED,
        reconnectable: false,
      },
      wsStatusChanged({ status: 'connected', socketId: 'sock-1' }),
    );
    expect(dirty.status).toBe('connected');
    expect(dirty.socketId).toBe('sock-1');
    expect(dirty.connectedAt).toBeGreaterThan(0);
    expect(dirty.lastError).toBeNull();
    expect(dirty.forceDisconnectReason).toBeNull();
    expect(dirty.reconnectable).toBeNull();
  });

  it('statusChanged → non-connected preserves prior error info', () => {
    const next = wsReducer(
      { ...initial, lastError: { code: 'X', message: 'x' } },
      wsStatusChanged({ status: 'reconnecting', socketId: null }),
    );
    expect(next.lastError).toEqual({ code: 'X', message: 'x' });
  });

  it('errored stashes the payload', () => {
    const next = wsReducer(initial, wsErrored({ code: 'BAD', message: 'boom' }));
    expect(next.lastError).toEqual({ code: 'BAD', message: 'boom' });
  });

  it('forceDisconnected records reason and reconnectable flag', () => {
    const next = wsReducer(
      initial,
      wsForceDisconnected({
        reason: WS_DISCONNECT_REASON.SESSION_REVOKED,
        reconnectable: false,
      }),
    );
    expect(next.forceDisconnectReason).toBe(WS_DISCONNECT_REASON.SESSION_REVOKED);
    expect(next.reconnectable).toBe(false);
  });

  it('connectStarted records anonymous flag', () => {
    const next = wsReducer(initial, wsConnectStarted({ anonymous: true }));
    expect(next.anonymous).toBe(true);
  });

  it('reset returns to initial', () => {
    const dirty = wsReducer(
      { ...initial, status: 'connected', socketId: 's', connectedAt: 1 },
      wsReset(),
    );
    expect(dirty).toEqual(initial);
  });
});
