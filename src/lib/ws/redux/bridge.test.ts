import { describe, expect, it } from 'vitest';

import { makeStore } from '@/store';

import { LifecycleEmitter, type WsClient } from '../client';
import { WS_DISCONNECT_REASON } from '../types';
import { attachWsBridge } from './bridge';

/**
 * The bridge is the **only** code path that dispatches into the ws slice.
 * Each lifecycle emitter event must map to exactly one Redux action.
 */
describe('attachWsBridge', () => {
  function setup() {
    const emitter = new LifecycleEmitter();
    const fakeClient = { on: emitter.on.bind(emitter) } as unknown as WsClient;
    const store = makeStore();
    const teardown = attachWsBridge(fakeClient, store.dispatch);
    return { emitter, store, teardown };
  }

  it('statusChange → ws.status + ws.socketId', () => {
    const { emitter, store } = setup();
    emitter.emit('statusChange', 'connected', 'sock-1');
    const ws = store.getState().ws;
    expect(ws.status).toBe('connected');
    expect(ws.socketId).toBe('sock-1');
  });

  it('socketIdChange → ws.socketId only', () => {
    const { emitter, store } = setup();
    emitter.emit('socketIdChange', 'sock-xyz');
    expect(store.getState().ws.socketId).toBe('sock-xyz');
  });

  it('error → ws.lastError', () => {
    const { emitter, store } = setup();
    emitter.emit('error', { code: 'BAD', message: 'boom' });
    expect(store.getState().ws.lastError).toEqual({ code: 'BAD', message: 'boom' });
  });

  it('forceDisconnect → ws.forceDisconnectReason + ws.reconnectable', () => {
    const { emitter, store } = setup();
    emitter.emit('forceDisconnect', {
      reason: WS_DISCONNECT_REASON.SESSION_REVOKED,
      reconnectable: false,
    });
    const ws = store.getState().ws;
    expect(ws.forceDisconnectReason).toBe(WS_DISCONNECT_REASON.SESSION_REVOKED);
    expect(ws.reconnectable).toBe(false);
  });

  it('teardown detaches every listener', () => {
    const emitter = new LifecycleEmitter();
    const fakeClient = { on: emitter.on.bind(emitter) } as unknown as WsClient;
    const store = makeStore();
    const teardown = attachWsBridge(fakeClient, store.dispatch);

    // Before teardown: lifecycle events DO reach the slice.
    emitter.emit('error', { code: 'BEFORE', message: 'before' });
    expect(store.getState().ws.lastError?.code).toBe('BEFORE');

    teardown();

    // After teardown: subsequent emits are inert.
    emitter.emit('error', { code: 'AFTER', message: 'after' });
    expect(store.getState().ws.lastError?.code).toBe('BEFORE');
  });
});
