import { beforeEach, describe, expect, it, vi } from 'vitest';

const error = vi.fn();
vi.mock('./index', () => ({ logger: { error: (...args: unknown[]) => error(...args) } }));

const { reportRequestError } = await import('./request-error');

describe('reportRequestError', () => {
  beforeEach(() => error.mockReset());

  it('logs the digest and request id but never the raw headers', () => {
    const err = Object.assign(new Error('boom'), { digest: '123' });
    reportRequestError(
      err,
      {
        path: '/dashboard',
        method: 'GET',
        headers: { cookie: 'session=secret', 'x-request-id': 'req-1' },
      },
      {
        routerKind: 'App Router',
        routePath: '/[locale]/dashboard',
        routeType: 'render',
        renderSource: 'react-server-components',
        revalidateReason: undefined,
      },
    );
    expect(error).toHaveBeenCalledTimes(1);
    const [fields, message] = error.mock.calls[0] as [Record<string, unknown>, string];
    expect(message).toBe('Unhandled server error');
    expect(fields).toMatchObject({
      digest: '123',
      requestId: 'req-1',
      path: '/dashboard',
      routeType: 'render',
    });
    expect(JSON.stringify(fields)).not.toContain('secret');
  });
});
