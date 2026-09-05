import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { AppApis } from '@/lib/config/app-apis';
import { publicServerHttp } from '@/lib/http/server';
import { logger } from '@/lib/logger';

import {
  DEFAULT_SIGN_IN_CAPABILITIES,
  type SignInCapabilities,
  signInCapabilitiesSchema,
} from './schema';

export const SIGN_IN_CAPABILITIES_TAG = 'account:sign-in-capabilities';

/**
 * Data access for Server Components.
 *
 * Public, user-independent data goes through `use cache`: one upstream call
 * serves every visitor until the profile expires or `revalidateTag` is
 * called with the tag above. Anything that depends on the caller's cookies
 * must not be cached this way (see `getCurrentUser` in `@/lib/auth`).
 *
 * `publicServerHttp` is used on purpose: `serverHttp` forwards cookies,
 * which would make the function request-scoped and defeat the cache.
 */
export async function getSignInCapabilities(): Promise<SignInCapabilities> {
  'use cache';
  cacheTag(SIGN_IN_CAPABILITIES_TAG);

  const result = await publicServerHttp.get(AppApis.auth.capabilities, {
    schema: signInCapabilitiesSchema,
    skipAuth: true,
  });
  if (result.ok) {
    cacheLife('hours');
    return result.data;
  }
  // A fallback is cached only briefly so the next visitor retries upstream.
  cacheLife('seconds');
  logger.warn({ err: result.error }, 'Sign-in capabilities unavailable, using defaults');
  return DEFAULT_SIGN_IN_CAPABILITIES;
}
