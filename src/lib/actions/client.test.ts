import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { HttpError } from '@/lib/errors';

import { ACTION_ERROR_CODE } from './errors';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const getCurrentUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: () => getCurrentUser() }));

const { actionClient, authActionClient } = await import('./client');

const echo = actionClient
  .metadata({ name: 'test.echo' })
  .inputSchema(z.object({ name: z.string().min(2) }))
  .action(async ({ parsedInput, ctx }) => ({ hello: parsedInput.name, requestId: ctx.requestId }));

describe('actionClient', () => {
  it('validates input and returns field errors without running the action', async () => {
    const result = await echo({ name: 'x' });
    expect(result.data).toBeUndefined();
    expect(result.validationErrors?.name?._errors?.[0]).toMatch(/2/);
  });

  it('runs the action with a request id in context', async () => {
    const result = await echo({ name: 'ada' });
    expect(result.data?.hello).toBe('ada');
    expect(result.data?.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps thrown HttpErrors to their plain shape', async () => {
    const failing = actionClient.metadata({ name: 'test.fail' }).action(async () => {
      throw new HttpError({ message: 'Too many', status: 429, code: 'ERR_RATE' });
    });
    const result = await failing();
    expect(result.serverError).toMatchObject({ kind: 'HttpError', status: 429, code: 'ERR_RATE' });
  });

  it('hides unknown error messages', async () => {
    const failing = actionClient.metadata({ name: 'test.fail' }).action(async () => {
      throw new Error('DATABASE_URL=postgres://secret');
    });
    const result = await failing();
    expect(result.serverError?.code).toBe(ACTION_ERROR_CODE.INTERNAL);
    expect(result.serverError?.message).not.toContain('postgres');
  });
});

describe('authActionClient', () => {
  const whoami = authActionClient
    .metadata({ name: 'test.whoami' })
    .action(async ({ ctx }) => ({ id: ctx.user.id }));

  beforeEach(() => getCurrentUser.mockReset());

  it('refuses anonymous callers with a 401 server error', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await whoami();
    expect(result.data).toBeUndefined();
    expect(result.serverError).toMatchObject({
      code: ACTION_ERROR_CODE.UNAUTHENTICATED,
      status: 401,
    });
  });

  it('exposes the user in context when signed in', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      username: 'ada',
      isEmailVerified: true,
    });
    const result = await whoami();
    expect(result.data).toEqual({ id: 'u1' });
  });
});
