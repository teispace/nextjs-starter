import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateSEOMetadata } from '@/lib/config/seo';

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

// Reading `searchParams` is request-time work, so it lives in its own
// Suspense boundary and streams in; the rest of the page is a static shell.
async function ReturnNotice({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/auth/login'>['searchParams'];
}) {
  const [t, query] = await Promise.all([getTranslations('Auth'), searchParams]);
  const redirectTo = safeRedirectPath(query.redirectTo);
  if (!redirectTo) return null;
  return (
    <p className="text-gray-500 text-sm dark:text-gray-400">
      {t('redirectNotice', { path: redirectTo })}
    </p>
  );
}

// Placeholder target for `redirectToLogin`. The HTTP client sends
// unauthenticated users here with `?redirectTo=<original path>`; replace the
// body with your real sign-in flow and keep the route.
export default async function LoginPage({ searchParams }: PageProps<'/[locale]/auth/login'>) {
  const t = await getTranslations('Auth');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
        {t('signInTitle')}
      </h1>
      <p className="mb-4 max-w-md text-gray-500 dark:text-gray-400">{t('signInDescription')}</p>
      <Suspense fallback={null}>
        <ReturnNotice searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
