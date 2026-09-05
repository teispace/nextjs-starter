/**
 * Content Security Policy builder shared by `next.config.ts` (static mode)
 * and the proxy (nonce mode).
 *
 * Two modes, chosen with `CSP_MODE`:
 *
 * - **static** (default): a policy without nonces. Scripts must allow
 *   `'unsafe-inline'` because Next emits inline bootstrap scripts, so this
 *   mode does not stop injected inline scripts. It still blocks foreign
 *   script origins, plugins, framing, base-URI changes, and form hijacking,
 *   and it keeps every page prerenderable under Cache Components.
 * - **nonce**: the strict policy from the Next docs (`'nonce-…'` plus
 *   `'strict-dynamic'`). Next stamps the nonce on its own scripts. The price
 *   is that a nonce is per request, so every page renders dynamically and
 *   the static shell is lost. Turn it on for apps where XSS hardening
 *   outweighs prerendering.
 */
export interface CspOptions {
  nonce?: string;
  /** Origins the browser may fetch or open sockets to, besides self. */
  connectOrigins?: readonly string[];
  isDev?: boolean;
}

const origins = (list: readonly string[] | undefined): string[] =>
  (list ?? []).filter((o) => o.length > 0);

/** `https://api.example.com` → `wss://api.example.com` for socket connections. */
export const toWebSocketOrigin = (origin: string): string | null => {
  try {
    const url = new URL(origin);
    url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
    return url.origin;
  } catch {
    return null;
  }
};

export const buildCsp = ({ nonce, connectOrigins, isDev = false }: CspOptions = {}): string => {
  const connect = origins(connectOrigins).flatMap((origin) => {
    const ws = toWebSocketOrigin(origin);
    return ws ? [origin, ws] : [origin];
  });
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`
    : `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`;
  // Next injects inline styles for fonts and streaming; React sets style
  // attributes. `'unsafe-inline'` for styles is the pragmatic baseline.
  const styleSrc = nonce ? `'self' 'nonce-${nonce}' 'unsafe-inline'` : `'self' 'unsafe-inline'`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self'${connect.length ? ` ${connect.join(' ')}` : ''}`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
};
