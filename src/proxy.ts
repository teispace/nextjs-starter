import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

// Build the middleware once at module load (not per request) — the factory does
// non-trivial locale-matcher/route-parsing setup. Matches next-intl's docs.
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  // Run on every path except: API/tRPC routes, Next.js internals, Vercel
  // assets, /public files (favicon, robots, sitemap, og-image, manifest, etc.),
  // and any path with a static-asset extension.
  matcher: [
    // Metadata image routes generated from `opengraph-image.tsx` and friends
    // are served without an extension (`/opengraph-image`), so the exclusion
    // must not require one — otherwise next-intl rewrites them under the
    // locale and they 404.
    '/((?!api|trpc|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|opengraph-image(?:\\.[^/]+)?$|twitter-image(?:\\.[^/]+)?$|apple-icon(?:\\.[^/]+)?$|icon(?:\\.[^/]+)?$|.*\\.(?:js|css|map|json|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|mp4|webm)).*)',
  ],
};
