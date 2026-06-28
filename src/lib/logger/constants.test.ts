import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { SENSITIVE_REDACTION_PATHS } from './constants';

/**
 * Capture a single log line as a parsed object by writing to an in-memory
 * pino destination. Locks in the redaction guarantee against the real paths.
 */
function logOne(obj: Record<string, unknown>): Record<string, unknown> {
  const lines: string[] = [];
  const stream = { write: (chunk: string) => lines.push(chunk) };
  const logger = pino(
    {
      level: 'info',
      base: undefined,
      redact: { paths: SENSITIVE_REDACTION_PATHS, censor: '[REDACTED]', remove: false },
    },
    stream,
  );
  logger.info(obj, 'msg');
  return JSON.parse(lines[0]) as Record<string, unknown>;
}

describe('SENSITIVE_REDACTION_PATHS', () => {
  it('is accepted by pino without throwing', () => {
    expect(() => logOne({ ok: true })).not.toThrow();
  });

  it('redacts a root-level sensitive key', () => {
    expect(logOne({ token: 'secret' }).token).toBe('[REDACTED]');
    expect(logOne({ password: 'hunter2' }).password).toBe('[REDACTED]');
  });

  it('redacts a one-level-nested sensitive key', () => {
    const out = logOne({ user: { token: 'secret', name: 'ada' } });
    const user = out.user as Record<string, unknown>;
    expect(user.token).toBe('[REDACTED]');
    expect(user.name).toBe('ada');
  });

  it('redacts authorization on a top-level headers object', () => {
    const out = logOne({ headers: { authorization: 'Bearer x' } });
    const headers = out.headers as Record<string, unknown>;
    expect(headers.authorization).toBe('[REDACTED]');
  });

  it('redacts sensitive headers under req/res parents', () => {
    const reqOut = logOne({ req: { headers: { cookie: 'a=b' } } });
    expect(
      ((reqOut.req as Record<string, unknown>).headers as Record<string, unknown>).cookie,
    ).toBe('[REDACTED]');

    const resOut = logOne({ res: { headers: { 'set-cookie': 'a=b' } } });
    expect(
      ((resOut.res as Record<string, unknown>).headers as Record<string, unknown>)['set-cookie'],
    ).toBe('[REDACTED]');
  });

  it('redacts sensitive keys in a request body', () => {
    const out = logOne({ req: { body: { password: 'p', accessToken: 't' } } });
    const body = (out.req as Record<string, unknown>).body as Record<string, unknown>;
    expect(body.password).toBe('[REDACTED]');
    expect(body.accessToken).toBe('[REDACTED]');
  });
});
