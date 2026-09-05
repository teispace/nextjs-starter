import { env } from '@/lib/env';
import { isServer } from '@/lib/runtime';

import { API_PREFIX } from './constants';

/** Same-origin proxy that forwards to the API (`src/app/api/backend/[...path]/route.ts`). */
export const BFF_PREFIX = '/api/backend';

/**
 * Where the universal HTTP client sends requests.
 *
 * In the browser every call goes through the same-origin proxy, so the API
 * origin never reaches the client bundle and cookies stay first-party. On
 * the server the proxy would be a pointless hop, so the client resolves the
 * API directly, preferring the private `API_INTERNAL_URL`. `NEXT_PUBLIC_API_URL`
 * is still read for the rare server-side use of the universal client.
 */
export function getApiBaseUrl(): string {
  if (!isServer()) return BFF_PREFIX;
  const origin = (env.NEXT_PUBLIC_API_URL ?? env.NEXT_PUBLIC_APP_URL).trim().replace(/\/$/, '');
  return `${origin.replace(/\/api\/v\d+$/, '')}${API_PREFIX}`;
}
