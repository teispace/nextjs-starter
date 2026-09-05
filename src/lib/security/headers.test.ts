import { describe, expect, it } from 'vitest';

import { buildCsp } from './csp';
import { securityHeaders } from './headers';

const keys = (headers: { key: string }[]) => headers.map((h) => h.key);

describe('securityHeaders', () => {
  it('sends HSTS and upgrade-insecure-requests only for an https origin', () => {
    const http = securityHeaders({ csp: true, https: false });
    expect(keys(http)).not.toContain('Strict-Transport-Security');
    expect(http.find((h) => h.key === 'Content-Security-Policy')?.value).not.toContain(
      'upgrade-insecure-requests',
    );

    const https = securityHeaders({ csp: true, https: true });
    expect(keys(https)).toContain('Strict-Transport-Security');
    expect(https.find((h) => h.key === 'Content-Security-Policy')?.value).toContain(
      'upgrade-insecure-requests',
    );
  });

  it('omits the CSP when the proxy owns it and never sends X-XSS-Protection', () => {
    const headers = securityHeaders({ csp: false });
    expect(keys(headers)).not.toContain('Content-Security-Policy');
    expect(keys(headers)).not.toContain('X-XSS-Protection');
    expect(keys(headers)).toEqual(
      expect.arrayContaining(['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']),
    );
  });
});

describe('buildCsp', () => {
  it('uses a nonce with strict-dynamic in nonce mode and unsafe-inline otherwise', () => {
    expect(buildCsp({ nonce: 'abc' })).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(buildCsp()).toContain("script-src 'self' 'unsafe-inline'");
    expect(buildCsp({ isDev: true })).toContain("'unsafe-eval'");
    expect(buildCsp()).not.toContain("'unsafe-eval'");
  });

  it('adds API origins and their socket counterparts to connect-src', () => {
    const csp = buildCsp({ connectOrigins: ['https://api.example.com', ''] });
    expect(csp).toContain("connect-src 'self' https://api.example.com wss://api.example.com");
  });
});
