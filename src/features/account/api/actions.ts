'use server';

import { revalidateTag } from 'next/cache';

import { authActionClient } from '@/lib/actions';
import { relaySetCookies } from '@/lib/auth';
import { AppApis } from '@/lib/config/app-apis';
import { serverHttp } from '@/lib/http/server';

import type { SignOutOutput } from './schema';
import { SIGN_IN_CAPABILITIES_TAG } from './server';

/**
 * Server Actions for the account feature.
 *
 * Every action here runs through `authActionClient`, so it already knows the
 * caller (`ctx.user`) and refuses anonymous calls. The API is reached with
 * the server client, which forwards the session cookie; the API's response
 * cookies are relayed back so the browser session changes in the same round
 * trip.
 */
export const signOut = authActionClient
  .metadata({ name: 'account.signOut' })
  .action(async (): Promise<SignOutOutput> => {
    const result = await serverHttp.post<void>(AppApis.auth.logout, undefined, {
      onResponse: (response) => void relaySetCookies(response),
    });
    // The API session is gone either way once it answers 401; only other
    // failures are worth surfacing.
    if (!(result.ok || result.error.isUnauthorized())) throw result.error;
    revalidateTag(SIGN_IN_CAPABILITIES_TAG, 'max');
    return { signedOut: true };
  });
