import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';
import { isDevelopment, servesHttps } from './lib/config/constants';
import { env } from './lib/env';
import {
  generateRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
} from './lib/http/shared/request-id';
import { buildCsp } from './lib/security/csp';
import { NONCE_HEADER } from './lib/security/nonce';

// Build the middleware once at module load (not per request) — the factory does
// non-trivial locale-matcher/route-parsing setup. Matches next-intl's docs.
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  // One id per request, shared by the render, the server HTTP client, and
  // the API's logs. A well-formed incoming id (from an edge or gateway) is
  // kept; anything else is replaced so a client cannot forge correlation.
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && isValidRequestId(incoming) ? incoming : generateRequestId();
  request.headers.set(REQUEST_ID_HEADER, requestId);

  if (env.CSP_MODE !== 'nonce') {
    const response = handleI18nRouting(request);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Strict CSP: a fresh nonce per request, handed to Next through the request
  // headers (it stamps its own scripts from the `Content-Security-Policy`
  // request header) and to the layout through `x-nonce`. next-intl copies the
  // request headers onto the response it builds, so mutating them here is
  // enough for the rewrite/next response.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({
    nonce,
    connectOrigins: [env.NEXT_PUBLIC_API_URL ?? ''],
    isDev: isDevelopment,
    https: servesHttps,
  });
  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set('Content-Security-Policy', csp);

  const response = handleI18nRouting(request);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Run on every path except: API/tRPC routes, Next.js internals, Vercel
  // assets, /public files (favicon, robots, sitemap, manifest, etc.),
  // and any path with a static-asset extension.
  matcher: [
    // Extensionless metadata routes (`/opengraph-image`, `/icon`) deliberately
    // pass through: they live under `[locale]` and rely on the same locale
    // rewrite as pages. Only their static-file forms are excluded.
    '/((?!api|trpc|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|opengraph-image\\.[^/]+|twitter-image\\.[^/]+|apple-icon\\.[^/]+|icon\\.[^/]+|.*\\.(?:js|css|map|json|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|mp4|webm)).*)',
  ],
};
