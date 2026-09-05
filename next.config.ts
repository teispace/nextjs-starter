import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import withBundleAnalyzer from '@next/bundle-analyzer';

import { isDevelopment, isProduction } from './src/lib/config/constants';
import { env } from './src/lib/env';
import { securityHeaders } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  output: env.BUILD_STANDALONE ? 'standalone' : undefined,
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
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders({
        // In nonce mode the proxy owns the CSP so it can vary per request.
        csp: env.CSP_MODE === 'static',
        connectOrigins: [env.NEXT_PUBLIC_API_URL ?? ''],
        isDev: isDevelopment,
      }),
    },
  ],
};

const withNextIntl = createNextIntlPlugin();
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default bundleAnalyzer(withNextIntl(nextConfig));
