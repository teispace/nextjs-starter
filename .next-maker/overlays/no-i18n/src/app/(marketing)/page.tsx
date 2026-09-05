import { Suspense } from 'react';

import type { Metadata } from 'next';

import { accountKeys, SignInOptions } from '@/features/account';
import { getSignInCapabilities, SessionStatus } from '@/features/account/server';
// @next-maker:state
import { Counter } from '@/features/counter';
import { APP_DESCRIPTION, APP_NAME, generateSEOMetadata } from '@/lib/config/seo';
import { HydrateQueries, prefetchQuery } from '@/lib/query';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: APP_NAME,
  description: APP_DESCRIPTION,
  path: '/',
});

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

export default function Home() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center">
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      <div className="flex flex-col items-center gap-6">
        <div className="font-bold text-2xl">{APP_NAME}</div>
        {/* @next-maker:state */}
        <Counter />
        <Suspense fallback={null}>
          <SignInOptionsSection />
        </Suspense>
        <Suspense fallback={null}>
          <SessionStatus />
        </Suspense>
      </div>
    </div>
  );
}
