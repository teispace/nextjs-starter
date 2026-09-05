import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';
import { AppPaths } from '@/lib/config/app-paths';

/**
 * Server Component: reads the session once per request through the cached
 * DAL and renders either the signed-in user or a sign-in link. Because it
 * reads cookies it must sit under a `<Suspense>` boundary.
 */
export async function SessionStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="text-gray-500 text-sm dark:text-gray-400">
        You are signed out.{' '}
        <Link href={AppPaths.auth.login} className="underline">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <p className="text-gray-500 text-sm dark:text-gray-400">
      Signed in as {user.username}.{' '}
      <Link href={AppPaths.dashboard} className="underline">
        Open dashboard
      </Link>
    </p>
  );
}
