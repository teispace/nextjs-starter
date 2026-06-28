import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Counter } from '@/features/counter';
import { routing } from '@/i18n/routing';
import { generateSEOMetadata } from '@/lib/config/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'App' });

  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/',
    locale,
  });
}

export default async function Home(props: Props) {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

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
