import { buildCsp } from './csp';

export interface SecurityHeaderOptions {
  /** Send a static CSP from `next.config.ts`. Off when the proxy sets a nonce policy. */
  csp: boolean;
  connectOrigins?: readonly string[];
  isDev?: boolean;
  /** The app is served over https; adds HSTS and `upgrade-insecure-requests`. */
  https?: boolean;
}

/**
 * Response headers applied to every route from `next.config.ts`.
 *
 * `X-XSS-Protection` is deliberately absent: modern browsers ignore it and
 * its filter introduced vulnerabilities in the ones that did not. CSP is
 * the replacement.
 */
export const securityHeaders = ({
  csp,
  connectOrigins,
  isDev = false,
  https = false,
}: SecurityHeaderOptions): { key: string; value: string }[] => {
  const headers = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    {
      key: 'Permissions-Policy',
      value:
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
    },
  ];
  if (https) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }
  if (csp) {
    headers.push({
      key: 'Content-Security-Policy',
      value: buildCsp({ connectOrigins, isDev, https }),
    });
  }
  return headers;
};
