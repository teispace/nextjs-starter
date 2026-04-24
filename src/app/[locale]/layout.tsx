import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Livvic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getMessages, getTimeZone, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { APP_NAME, APP_URL } from '@/lib/config/seo';
import { RootProvider } from '@/providers';

const livvic = Livvic({
  subsets: ['latin'],
  variable: '--font-livvic',
  weight: ['100', '200', '300', '400', '500', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: 'Starter template for Next.js projects with TypeScript and Tailwind CSS',
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [messages, timeZone] = await Promise.all([getMessages(), getTimeZone()]);

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body className={`${livvic.variable} bg-light antialiased dark:bg-dark`}>
        <RootProvider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
