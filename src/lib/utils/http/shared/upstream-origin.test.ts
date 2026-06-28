import { describe, expect, it } from 'vitest';

import { resolvesToUpstream } from './upstream-origin';

describe('resolvesToUpstream', () => {
  const base = 'https://api.example.com/api/v1';

  it('trusts relative request paths', () => {
    expect(resolvesToUpstream('/me', base)).toBe(true);
    expect(resolvesToUpstream('users?page=1', base)).toBe(true);
  });

  it('trusts an absolute URL on the same origin as baseURL', () => {
    expect(resolvesToUpstream('https://api.example.com/anything', base)).toBe(true);
  });

  it('rejects an absolute URL on a foreign origin', () => {
    expect(resolvesToUpstream('https://attacker.example/steal', base)).toBe(false);
    expect(resolvesToUpstream('http://api.example.com/me', base)).toBe(false); // scheme differs
  });

  it('rejects any absolute URL when baseURL is relative (no API origin configured)', () => {
    expect(resolvesToUpstream('https://api.example.com/me', '/api/v1')).toBe(false);
    expect(resolvesToUpstream('/me', '/api/v1')).toBe(true);
  });

  it('treats an unparseable absolute URL as untrusted', () => {
    expect(resolvesToUpstream('https://[::bad', base)).toBe(false);
  });
});
