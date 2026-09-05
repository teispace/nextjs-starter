import 'server-only';

import { cache } from 'react';

import { redirect } from 'next/navigation';

import { AppApis } from '@/lib/config/app-apis';
import { AppPaths } from '@/lib/config/app-paths';
import { serverHttp } from '@/lib/http/server';
import { logger } from '@/lib/logger';
import type { AuthUser } from '@/types';

/**
 * Session access for Server Components, Server Actions, and Route Handlers.
 *
 * `getCurrentUser` asks the API who the cookie belongs to. It is wrapped in
 * React `cache` so a render that needs the user in several places makes one
 * upstream call, and it is deliberately not a `use cache` function: sessions
 * are per user and per request and must never be served from a shared cache.
 * Reading cookies makes the caller dynamic; put it under `<Suspense>`.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const result = await serverHttp.get<AuthUser>(AppApis.auth.me, { retry: false });
  if (result.ok) return result.data;
  if (!result.error.isUnauthorized()) {
    logger.warn({ err: result.error }, 'Session lookup failed');
  }
  return null;
});

/** Like `getCurrentUser`, but sends signed-out visitors to sign in and back again. */
export const requireUser = async (returnTo?: string): Promise<AuthUser> => {
  const user = await getCurrentUser();
  if (user) return user;
  const target = returnTo
    ? `${AppPaths.auth.login}?redirectTo=${encodeURIComponent(returnTo)}`
    : AppPaths.auth.login;
  redirect(target);
};
