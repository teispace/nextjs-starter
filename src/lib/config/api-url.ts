import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { API_PREFIX } from './constants';

const TRAILING_API_PREFIX = /\/api\/v\d+\/?$/;

/**
 * Compose the API base URL the HTTP clients should hit.
 *
 * `NEXT_PUBLIC_API_URL` is the **bare origin** (e.g. `https://api.example.com`).
 * If an operator accidentally includes the `/api/v{n}` suffix, strip it and
 * warn — keeps the request path correct without silently double-prefixing.
 *
 * Lives outside `constants.ts` because `next.config.ts` imports from
 * `constants.ts` at config-load time, before path aliases are wired up.
 */
export function getApiBaseUrl(): string {
  const raw = (env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return API_PREFIX;

  const origin = raw.replace(/\/$/, '');

  if (TRAILING_API_PREFIX.test(origin)) {
    const cleaned = origin.replace(TRAILING_API_PREFIX, '');
    logger.warn(
      { provided: raw, used: `${cleaned}${API_PREFIX}` },
      'NEXT_PUBLIC_API_URL should be the bare origin; the /api/v{n} suffix is added internally.',
    );
    return `${cleaned}${API_PREFIX}`;
  }

  return `${origin}${API_PREFIX}`;
}
