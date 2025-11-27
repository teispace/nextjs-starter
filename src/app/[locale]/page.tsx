import { Count } from '@/components';
import { SupportedLocale } from '@/types/i18n';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = (await props.params).locale as SupportedLocale;
  const t = await getTranslations({
    locale,
    namespace: 'App',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function Home(props: Props) {
  const locale = (await props.params).locale as SupportedLocale;
  setRequestLocale(locale);

  const t = await getTranslations('App');

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-2xl font-bold">{t('title')}</div>
        <Count />
      </div>
    </div>
  );
}
