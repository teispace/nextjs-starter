import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

import { Livvic } from 'next/font/google';

// @next-maker:darkMode
import { ThemeProvider } from '@teispace/next-themes';
// @next-maker:darkMode
import { getThemeScript } from '@teispace/next-themes/server';

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_URL,
  DEFAULT_OG_IMAGE_PATH,
  THEME_COLORS,
} from '@/lib/config/seo';
// Regression sentinel — see file comment for what this guards.
import { HttpClientBundleSentinel } from '@/lib/http/__bundle-sentinel__/client-bundle-sentinel';
// @next-maker:darkMode
import { getNonce } from '@/lib/security/nonce';
// @next-maker:darkMode
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
  description: APP_DESCRIPTION,
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
};

/* @next-maker:darkMode:start */
// The anti-flash script is a pure function of the theme config, so it is
// built once per process, not per request.
const themeScript = getThemeScript(themeScriptConfig);
/* @next-maker:darkMode:end */

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // @next-maker:darkMode
  const nonce = await getNonce();

  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* @next-maker:darkMode:start */}
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: anti-flash theme script, built from trusted config */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* @next-maker:darkMode:end */}
      <body className={`${livvic.variable} bg-light antialiased dark:bg-dark`}>
        <ThemeProvider {...themeProviderConfig} noScript={true} nonce={nonce}>
          <RootProvider>
            <HttpClientBundleSentinel />
            {children}
          </RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
