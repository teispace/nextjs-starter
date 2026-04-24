import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Counter } from '@/features/counter';
import { generateSEOMetadata } from '@/lib/config/seo';
import type { SupportedLocale } from '@/types/i18n';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = (await props.params).locale as SupportedLocale;
  const t = await getTranslations({
    locale,
    namespace: 'App',
  });

  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/',
  });
}

export default async function Home(props: Props) {
  const locale = (await props.params).locale as SupportedLocale;
  setRequestLocale(locale);

  const t = await getTranslations('App');

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="font-bold text-2xl">{t('title')}</div>
        <Counter />
      </div>
    </div>
  );
}
