import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_ERROR_CODE } from '@/lib/actions';
import { HttpError } from '@/lib/errors';
import { fail, ok } from '@/types';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

const getCurrentUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: () => getCurrentUser() }));
const relaySetCookies = vi.fn();
vi.mock('@/lib/auth/cookies', () => ({ relaySetCookies: (r: Response) => relaySetCookies(r) }));

const post = vi.fn();
vi.mock('@/lib/http/server', () => ({
  serverHttp: { post: (...args: unknown[]) => post(...args) },
}));

const { signOut } = await import('./actions');
const { revalidateTag } = await import('next/cache');

const user = { id: 'u1', email: 'a@b.c', username: 'ada', isEmailVerified: true };

describe('signOut', () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    post.mockReset();
    relaySetCookies.mockReset();
  });

  it('refuses anonymous callers', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await signOut();
    expect(result.serverError?.code).toBe(ACTION_ERROR_CODE.UNAUTHENTICATED);
    expect(post).not.toHaveBeenCalled();
  });

  it('calls the API, relays its cookies, and revalidates', async () => {
    getCurrentUser.mockResolvedValue(user);
    const response = new Response(null, { status: 204 });
    post.mockImplementation(async (_url, _body, options) => {
      options.onResponse(response);
      return ok(undefined);
    });
    const result = await signOut();
    expect(result.data).toEqual({ signedOut: true });
    expect(post).toHaveBeenCalledWith('/auth/logout', undefined, expect.any(Object));
    expect(relaySetCookies).toHaveBeenCalledWith(response);
    expect(revalidateTag).toHaveBeenCalled();
  });

  it('treats an already-expired session as signed out', async () => {
    getCurrentUser.mockResolvedValue(user);
    post.mockResolvedValue(fail(new HttpError({ message: 'expired', status: 401 })));
    const result = await signOut();
    expect(result.data).toEqual({ signedOut: true });
  });

  it('surfaces other API failures as a server error', async () => {
    getCurrentUser.mockResolvedValue(user);
    post.mockResolvedValue(fail(new HttpError({ message: 'down', status: 503 })));
    const result = await signOut();
    expect(result.serverError).toMatchObject({ status: 503 });
  });
});
