import type { NextConfig } from 'next';
// @next-maker:i18n
import createNextIntlPlugin from 'next-intl/plugin';

// @next-maker:analyzer
import withBundleAnalyzer from '@next/bundle-analyzer';

import { isDevelopment, servesHttps } from './src/lib/config/constants';
import { env } from './src/lib/env';
import { securityHeaders } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  output: env.BUILD_STANDALONE ? 'standalone' : undefined,
  // @next-maker:reactCompiler
  reactCompiler: true,
  // Partial prerendering with explicit caching: static shells stream
  // instantly, dynamic parts stream in. `use cache` / `cacheTag` are the only
  // cache vocabulary; nothing is cached by accident.
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  experimental: {
    // Lets the Data Access Layer mark objects that must never reach the client.
    taint: true,
    // `forbidden()` and `unauthorized()`. Authorization failures deserve their
    // own page and status, not a redirect that loses what the visitor wanted.
    authInterrupts: true,
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders({
        // In nonce mode the proxy owns the CSP so it can vary per request.
        csp: env.CSP_MODE === 'static',
        connectOrigins: [env.NEXT_PUBLIC_API_URL ?? ''],
        isDev: isDevelopment,
        https: servesHttps,
      }),
    },
  ],
};

// @next-maker:i18n
const withNextIntl = createNextIntlPlugin();
/* @next-maker:analyzer:start */
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
/* @next-maker:analyzer:end */

export default bundleAnalyzer(withNextIntl(nextConfig));
