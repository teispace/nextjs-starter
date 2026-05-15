import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isBrowserMock = vi.fn();
vi.mock('./runtime', () => ({
  isBrowser: () => isBrowserMock(),
  isServer: () => !isBrowserMock(),
}));

const readServerCookieHeaderMock = vi.fn();
vi.mock('./server-cookies', () => ({
  readServerCookieHeader: () => readServerCookieHeaderMock(),
}));

// Import AFTER mocks so the module picks them up.
const { getCookieHeaderForRequest } = await import('./cookie-injection');

describe('getCookieHeaderForRequest', () => {
  beforeEach(() => {
    isBrowserMock.mockReset();
    readServerCookieHeaderMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined in the browser (no server-cookies import)', async () => {
    isBrowserMock.mockReturnValue(true);

    const result = await getCookieHeaderForRequest();

    expect(result).toBeUndefined();
    expect(readServerCookieHeaderMock).not.toHaveBeenCalled();
  });

  it('returns the server cookie header when running on the server', async () => {
    isBrowserMock.mockReturnValue(false);
    readServerCookieHeaderMock.mockResolvedValue('session=abc; csrf=xyz');

    const result = await getCookieHeaderForRequest();

    expect(result).toBe('session=abc; csrf=xyz');
    expect(readServerCookieHeaderMock).toHaveBeenCalledOnce();
  });

  it('returns undefined on the server when no cookies are present (empty string)', async () => {
    isBrowserMock.mockReturnValue(false);
    readServerCookieHeaderMock.mockResolvedValue('');

    const result = await getCookieHeaderForRequest();

    // Empty header serves no purpose — the helper normalises empty → undefined
    // so callers don't have to special-case it.
    expect(result).toBeUndefined();
  });
});
