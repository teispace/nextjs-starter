import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { Counter } from '@/features/counter';
import { generateSEOMetadata } from '@/lib/config/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('App')]);
  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/',
    locale,
  });
}

export default async function Home() {
  const t = await getTranslations('App');

  return (
    <div className="flex min-h-dvh w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="font-bold text-2xl">{t('title')}</div>
        <Counter />
      </div>
    </div>
  );
}
