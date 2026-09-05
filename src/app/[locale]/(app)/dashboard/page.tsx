import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '@/features/account';
import { requireUser } from '@/lib/auth';
import { AppPaths } from '@/lib/config/app-paths';
import { generateSEOMetadata } from '@/lib/config/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Account');
  return generateSEOMetadata({
    title: t('dashboardTitle'),
    description: t('dashboardDescription'),
    path: AppPaths.dashboard,
    noIndex: true,
  });
}

// The session check lives in the page, not a layout: layouts do not re-run
// on client navigation, so a layout-level check is a false sense of safety.
// Every data read on this page goes through the DAL, which checks again.
async function Welcome() {
  const [t, user] = await Promise.all([
    getTranslations('Account'),
    requireUser(AppPaths.dashboard),
  ]);
  return (
    <>
      <h1 className="font-bold text-2xl">{t('welcome', { name: user.username })}</h1>
      <p className="text-gray-500 text-sm dark:text-gray-400">{user.email}</p>
      <SignOutButton />
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Suspense fallback={null}>
        <Welcome />
      </Suspense>
    </div>
  );
}
