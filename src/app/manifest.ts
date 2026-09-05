import type { MetadataRoute } from 'next';

import { APP_DESCRIPTION, APP_NAME, THEME_COLORS } from '@/lib/config/seo';

// Served at `/manifest.webmanifest` and linked from every page by Next.
// It reads no request data, so it is prerendered once at build time.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.dark,
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
