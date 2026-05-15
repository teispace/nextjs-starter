import { env } from '@/lib/env';

import { WS_NAMESPACE } from '../constants';

/**
 * Compose the WebSocket URL to connect to.
 *
 * Reuses `NEXT_PUBLIC_API_URL` so operators don't need a second env var —
 * the WS layer talks to the same origin as the HTTP layer. We strip the
 * scheme + any trailing `/api/v{n}` and append the namespace:
 *
 *   https://api.example.com           → https://api.example.com/ws
 *   https://api.example.com/api/v1    → https://api.example.com/ws
 *   (empty NEXT_PUBLIC_API_URL)       → /ws                  (same-origin)
 *
 * Socket.IO accepts both absolute URLs and origin-relative paths. Returning
 * the namespace alone when no origin is configured keeps reverse-proxy
 * deployments working without configuration drift.
 */
const TRAILING_API_PREFIX = /\/api\/v\d+\/?$/;

export function getWsUrl(namespace: string = WS_NAMESPACE): string {
  const raw = (env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return namespace;

  const stripped = raw.replace(/\/$/, '').replace(TRAILING_API_PREFIX, '');
  return `${stripped}${namespace}`;
}
