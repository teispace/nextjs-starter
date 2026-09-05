import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/lib/errors';
import { fail, ok } from '@/types';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock('next/cache', () => ({
  cacheLife: (p: string) => cacheLife(p),
  cacheTag: (t: string) => cacheTag(t),
}));

const get = vi.fn();
vi.mock('@/lib/http/server', () => ({
  publicServerHttp: { get: (...args: unknown[]) => get(...args) },
}));

const { getSignInCapabilities, SIGN_IN_CAPABILITIES_TAG } = await import('./server');
const { DEFAULT_SIGN_IN_CAPABILITIES } = await import('./schema');

describe('getSignInCapabilities', () => {
  beforeEach(() => {
    get.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  it('tags the entry and caches a successful answer for hours', async () => {
    get.mockResolvedValue(ok({ providers: ['google'], allowSignUp: false }));
    await expect(getSignInCapabilities()).resolves.toEqual({
      providers: ['google'],
      allowSignUp: false,
    });
    expect(cacheTag).toHaveBeenCalledWith(SIGN_IN_CAPABILITIES_TAG);
    expect(cacheLife).toHaveBeenCalledWith('hours');
    expect(get).toHaveBeenCalledWith(
      '/auth/login/capabilities',
      expect.objectContaining({ skipAuth: true, schema: expect.anything() }),
    );
  });

  it('falls back to defaults with a short cache life when upstream fails', async () => {
    get.mockResolvedValue(fail(new HttpError({ message: 'down', status: 503 })));
    await expect(getSignInCapabilities()).resolves.toEqual(DEFAULT_SIGN_IN_CAPABILITIES);
    expect(cacheLife).toHaveBeenCalledWith('seconds');
  });
});
