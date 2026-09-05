import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '../../../../test/test-utils';

const emitMock = vi.fn();
vi.mock('../client', () => ({
  wsClient: { emit: emitMock },
}));

const { useWsEmit } = await import('./use-ws-emit');

describe('useWsEmit', () => {
  beforeEach(() => {
    emitMock.mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns a stable function across renders', () => {
    const { result, rerender } = renderHook(() => useWsEmit(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('forwards event + args to wsClient.emit', () => {
    emitMock.mockReturnValue(true);
    const { result } = renderHook(() => useWsEmit(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    const ok = result.current('presence:subscribe', { userId: 'u-1' });
    expect(emitMock).toHaveBeenCalledWith('presence:subscribe', { userId: 'u-1' });
    expect(ok).toBe(true);
  });

  it('returns false when the underlying client refuses (disconnected)', () => {
    emitMock.mockReturnValue(false);
    const { result } = renderHook(() => useWsEmit(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current('ping')).toBe(false);
  });
});
