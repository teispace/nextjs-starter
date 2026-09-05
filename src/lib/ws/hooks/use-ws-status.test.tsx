import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestProviders } from '../../../../test/test-utils';
import { WS_DISCONNECT_REASON } from '../types';
import { useWsStatus } from './use-ws-status';

describe('useWsStatus', () => {
  it('reflects the initial idle state', () => {
    const { result } = renderHook(() => useWsStatus(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isDisconnectedFatally).toBe(false);
  });

  it('reflects a connected store state', () => {
    const { result } = renderHook(() => useWsStatus(), {
      wrapper: ({ children }) => (
        <TestProviders
          preloadedState={{
            ws: {
              status: 'connected',
              socketId: 'sock-1',
              lastError: null,
              forceDisconnectReason: null,
              reconnectable: null,
              connectedAt: 123,
              anonymous: false,
            },
          }}
        >
          {children}
        </TestProviders>
      ),
    });
    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.socketId).toBe('sock-1');
  });

  it('flags a fatal disconnect when reconnectable=false', () => {
    const { result } = renderHook(() => useWsStatus(), {
      wrapper: ({ children }) => (
        <TestProviders
          preloadedState={{
            ws: {
              status: 'disconnected',
              socketId: null,
              lastError: null,
              forceDisconnectReason: WS_DISCONNECT_REASON.SESSION_REVOKED,
              reconnectable: false,
              connectedAt: null,
              anonymous: false,
            },
          }}
        >
          {children}
        </TestProviders>
      ),
    });
    expect(result.current.isDisconnectedFatally).toBe(true);
    expect(result.current.forceDisconnectReason).toBe(WS_DISCONNECT_REASON.SESSION_REVOKED);
  });
});
