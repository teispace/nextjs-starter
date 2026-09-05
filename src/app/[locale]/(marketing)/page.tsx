import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { SectionErrorBoundary } from '@/components';
import { accountKeys, SignInOptions } from '@/features/account';
import { getSignInCapabilities, SessionStatus } from '@/features/account/server';
// @next-maker:state
import { Counter } from '@/features/counter';
import { generateSEOMetadata } from '@/lib/config/seo';
import { HydrateQueries, prefetchQuery } from '@/lib/query';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('App')]);
  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/',
    locale,
  });
}

// Prefetch on the server through the cached DAL, render on the client from
// the hydrated cache. The DAL call is `use cache`, so this subtree is part of
// the static shell; the client-side `queryFn` only runs on a later refetch.
async function SignInOptionsSection() {
  await prefetchQuery({
    queryKey: accountKeys.signInCapabilities(),
    queryFn: getSignInCapabilities,
  });
  return (
    <HydrateQueries>
      <SignInOptions />
    </HydrateQueries>
  );
}

export default async function Home() {
  const [t, tError] = await Promise.all([getTranslations('App'), getTranslations('Error')]);
  const boundary = { title: tError('title'), retryLabel: tError('retry') };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center">
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      <div className="flex flex-col items-center gap-6">
        <div className="font-bold text-2xl">{t('title')}</div>
        {/* @next-maker:state */}
        <Counter />
        {/* Each section fails on its own: a broken query or session lookup
            shows a retry control here instead of unmounting the page. */}
        <SectionErrorBoundary {...boundary}>
          <Suspense fallback={null}>
            <SignInOptionsSection />
          </Suspense>
        </SectionErrorBoundary>
        <SectionErrorBoundary {...boundary}>
          <Suspense fallback={null}>
            <SessionStatus />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
