import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppPaths } from '@/lib/config/app-paths';

/**
 * Server Component: reads the session once per request through the cached
 * DAL and renders either the signed-in user or a sign-in link. Because it
 * reads cookies it must sit under a `<Suspense>` boundary.
 */
export async function SessionStatus() {
  const [t, user] = await Promise.all([getTranslations('Account'), getCurrentUser()]);

  if (!user) {
    return (
      <p className="text-gray-500 text-sm dark:text-gray-400">
        {t('signedOut')}{' '}
        <Link href={AppPaths.auth.login} className="underline">
          {t('signIn')}
        </Link>
      </p>
    );
  }

  return (
    <p className="text-gray-500 text-sm dark:text-gray-400">
      {t('signedInAs', { name: user.username })}{' '}
      <Link href={AppPaths.dashboard} className="underline">
        {t('openDashboard')}
      </Link>
    </p>
  );
}
