import { beforeEach, describe, expect, it, vi } from 'vitest';

const set = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => ({ set }) }));

const { parseSetCookie, relaySetCookies } = await import('./cookies');

describe('parseSetCookie', () => {
  it('parses name, value, and attributes', () => {
    expect(
      parseSetCookie(
        'session=abc; Path=/; Domain=.example.com; Max-Age=3600; HttpOnly; Secure; SameSite=Lax',
      ),
    ).toEqual({
      name: 'session',
      value: 'abc',
      path: '/',
      domain: '.example.com',
      maxAge: 3600,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
  });

  it('parses an expiry and ignores unknown or malformed attributes', () => {
    const parsed = parseSetCookie(
      'a=b; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Priority=High; Max-Age=x',
    );
    expect(parsed?.expires?.toISOString()).toBe('2026-10-21T07:28:00.000Z');
    expect(parsed?.maxAge).toBeUndefined();
  });

  it('rejects headers without a name', () => {
    expect(parseSetCookie('=value')).toBeNull();
    expect(parseSetCookie('novalue')).toBeNull();
  });
});

describe('relaySetCookies', () => {
  beforeEach(() => set.mockReset());

  it('applies every well-formed Set-Cookie header to the outgoing response', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'session=; Max-Age=0; Path=/; HttpOnly');
    headers.append('set-cookie', 'refresh=; Max-Age=0; Path=/api/auth; HttpOnly; Secure');
    headers.append('set-cookie', 'garbage');
    const applied = await relaySetCookies(new Response(null, { headers }));
    expect(applied).toBe(2);
    expect(set).toHaveBeenCalledWith(
      'session',
      '',
      expect.objectContaining({ maxAge: 0, path: '/', httpOnly: true }),
    );
  });

  it('does nothing when the response carries no cookies', async () => {
    await expect(relaySetCookies(new Response(null))).resolves.toBe(0);
    expect(set).not.toHaveBeenCalled();
  });
});
