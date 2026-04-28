import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export function proxy(request: NextRequest) {
  const handleI18nRouting = createMiddleware(routing);
  const response = handleI18nRouting(request);
  return response;
}

export const config = {
  // Run on every path except: API/tRPC routes, Next.js internals, Vercel
  // assets, /public files (favicon, robots, sitemap, og-image, manifest, etc.),
  // and any path with a static-asset extension.
  matcher: [
    '/((?!api|trpc|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|opengraph-image\\.[^/]+|twitter-image\\.[^/]+|apple-icon\\.[^/]+|icon\\.[^/]+|.*\\.(?:js|css|map|json|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|mp4|webm)).*)',
  ],
};
