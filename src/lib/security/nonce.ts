import { headers } from 'next/headers';

import { env } from '@/lib/env';

export const NONCE_HEADER = 'x-nonce';

/**
 * The per-request CSP nonce, or `undefined` outside nonce mode.
 *
 * Only reads request headers when `CSP_MODE=nonce`, because touching
 * `headers()` opts the render out of the static shell. In static mode the
 * inline theme script is allowed by `'unsafe-inline'` and needs no nonce.
 */
export const getNonce = async (): Promise<string | undefined> => {
  if (env.CSP_MODE !== 'nonce') return undefined;
  return (await headers()).get(NONCE_HEADER) ?? undefined;
};
