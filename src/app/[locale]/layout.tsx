import type { Metadata } from 'next';
import '@/styles/globals.css';

import { Livvic } from 'next/font/google';
import { getLocale, getMessages, getTimeZone } from 'next-intl/server';

import { ThemeProvider } from '@teispace/next-themes';
import { getThemeScript } from '@teispace/next-themes/server';

import { routing } from '@/i18n/routing';
import { getLocaleDirection } from '@/lib/config/app-locales';
import { APP_NAME, APP_URL, DEFAULT_OG_IMAGE_PATH } from '@/lib/config/seo';
// Regression sentinel — see file comment for what this guards.
import { HttpClientBundleSentinel } from '@/lib/http/__bundle-sentinel__/client-bundle-sentinel';
import { getNonce } from '@/lib/security/nonce';
import { themeProviderConfig, themeScriptConfig } from '@/lib/theme/config';
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
    images: [{ url: DEFAULT_OG_IMAGE_PATH, width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [DEFAULT_OG_IMAGE_PATH],
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

// The anti-flash script is a pure function of the theme config, so it is
// built once per process, not per request.
const themeScript = getThemeScript(themeScriptConfig);

export default async function RootLayout({ children }: LayoutProps<'/[locale]'>) {
  // The request config validates the `[locale]` root param and 404s on an
  // unsupported value, so by the time this runs `locale` is trusted.
  const [locale, messages, timeZone, nonce] = await Promise.all([
    getLocale(),
    getMessages(),
    getTimeZone(),
    getNonce(),
  ]);

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning={true}>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: anti-flash theme script, built from trusted config */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${livvic.variable} bg-light antialiased dark:bg-dark`}>
        <ThemeProvider {...themeProviderConfig} noScript={true} nonce={nonce}>
          <RootProvider locale={locale} messages={messages} timeZone={timeZone}>
            <HttpClientBundleSentinel />
            {children}
          </RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
