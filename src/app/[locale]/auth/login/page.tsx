import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateSEOMetadata } from '@/lib/config/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string | string[] }>;
};

// Only an app-relative path is ever echoed back: anything with a scheme or a
// protocol-relative prefix is dropped so the query string cannot inject a
// foreign destination into the page.
function safeRedirectPath(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth');
  return generateSEOMetadata({
    title: t('signInTitle'),
    description: t('signInDescription'),
    path: '/auth/login',
    noIndex: true,
  });
}

// Placeholder target for `handleUnauthorizedRedirect`. The HTTP clients send
// unauthenticated users here with `?redirectTo=<original path>`; replace the
// body with your real sign-in flow and keep the route.
export default async function LoginPage({ searchParams }: Props) {
  const [t, query] = await Promise.all([getTranslations('Auth'), searchParams]);
  const redirectTo = safeRedirectPath(query.redirectTo);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
        {t('signInTitle')}
      </h1>
      <p className="mb-4 max-w-md text-gray-500 dark:text-gray-400">{t('signInDescription')}</p>
      {redirectTo && (
        <p className="text-gray-500 text-sm dark:text-gray-400">
          {t('redirectNotice', { path: redirectTo })}
        </p>
      )}
    </div>
  );
}
