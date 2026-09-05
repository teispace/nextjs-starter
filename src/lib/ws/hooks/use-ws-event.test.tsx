import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '../../../../test/test-utils';

// Mock the wsClient module BEFORE importing the hook. The hook's lazy
// connect calls .getStatus() and may call .connect(); .onEvent() is the
// subscription path. Each is a vi.fn so we can assert call shape.
const onEventMock = vi.fn();
const connectMock = vi.fn().mockResolvedValue(undefined);
const getStatusMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock('../client', () => ({
  wsClient: {
    onEvent: (...args: unknown[]) => {
      onEventMock(...args);
      return unsubscribeMock;
    },
    connect: connectMock,
    getStatus: getStatusMock,
  },
}));

const { useWsEvent } = await import('./use-ws-event');

describe('useWsEvent', () => {
  beforeEach(() => {
    onEventMock.mockClear();
    connectMock.mockClear();
    getStatusMock.mockReset();
    unsubscribeMock.mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it('subscribes to the event on mount and unsubscribes on unmount', () => {
    getStatusMock.mockReturnValue('connected');
    const handler = vi.fn();

    const { unmount } = renderHook(() => useWsEvent('presence:online', handler), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(onEventMock).toHaveBeenCalledTimes(1);
    expect(onEventMock.mock.calls[0][0]).toBe('presence:online');

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('triggers lazy connect() when status is idle', () => {
    getStatusMock.mockReturnValue('idle');
    const noop = vi.fn();
    renderHook(() => useWsEvent('pong', noop), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT call connect() when already connected', () => {
    getStatusMock.mockReturnValue('connected');
    const noop = vi.fn();
    renderHook(() => useWsEvent('pong', noop), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    expect(connectMock).not.toHaveBeenCalled();
  });

  it('uses a stable handler ref — does not re-subscribe on handler-only re-render', () => {
    getStatusMock.mockReturnValue('connected');
    const { rerender } = renderHook(({ h }: { h: () => void }) => useWsEvent('pong', h as never), {
      initialProps: { h: vi.fn() },
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    rerender({ h: vi.fn() });
    rerender({ h: vi.fn() });

    // Only the first mount should have subscribed.
    expect(onEventMock).toHaveBeenCalledTimes(1);
  });

  it('forwards payloads to the latest handler ref', () => {
    getStatusMock.mockReturnValue('connected');
    let captured: ((p: unknown) => void) | undefined;
    onEventMock.mockImplementation((_event, dispatch: (p: unknown) => void) => {
      captured = dispatch;
      return unsubscribeMock;
    });

    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const { rerender } = renderHook(
      ({ h }: { h: (p: unknown) => void }) => useWsEvent('pong', h as never),
      {
        initialProps: { h: handlerA },
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      },
    );

    captured?.({ timestamp: 1 });
    expect(handlerA).toHaveBeenCalledWith({ timestamp: 1 });

    rerender({ h: handlerB });
    captured?.({ timestamp: 2 });
    expect(handlerB).toHaveBeenCalledWith({ timestamp: 2 });
    expect(handlerA).toHaveBeenCalledTimes(1); // still only the first call
  });
});
