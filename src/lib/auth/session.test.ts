import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/lib/errors';
import { fail, ok } from '@/types';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const get = vi.fn();
vi.mock('@/lib/http/server', () => ({ serverHttp: { get: (...args: unknown[]) => get(...args) } }));

const redirect = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock('next/navigation', () => ({ redirect: (t: string) => redirect(t) }));

const { getCurrentUser, requireUser } = await import('./session');

const user = { id: 'u1', email: 'a@b.c', username: 'ada', isEmailVerified: true };

describe('getCurrentUser', () => {
  beforeEach(() => get.mockReset());

  it('returns the user from the API', async () => {
    get.mockResolvedValue(ok(user));
    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ retry: false }));
  });

  it('treats 401 as signed out', async () => {
    get.mockResolvedValue(fail(new HttpError({ message: 'no', status: 401 })));
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('treats upstream failure as signed out rather than crashing the render', async () => {
    get.mockResolvedValue(fail(HttpError.network('down')));
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('requireUser', () => {
  beforeEach(() => get.mockReset());

  it('redirects to sign-in with a return path when signed out', async () => {
    get.mockResolvedValue(fail(new HttpError({ message: 'no', status: 401 })));
    await expect(requireUser('/dashboard')).rejects.toThrow(
      'NEXT_REDIRECT:/auth/login?redirectTo=%2Fdashboard',
    );
  });

  it('returns the user when signed in', async () => {
    get.mockResolvedValue(ok(user));
    await expect(requireUser('/dashboard')).resolves.toEqual(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});
