import { type NextRequest, NextResponse } from 'next/server';

import { isDevelopment } from './lib/config/constants';
import { env } from './lib/env';
import {
  generateRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
} from './lib/http/shared/request-id';
import { buildCsp } from './lib/security/csp';
import { NONCE_HEADER } from './lib/security/nonce';

export function proxy(request: NextRequest) {
  // One id per request, shared by the render, the server HTTP client, and
  // the API's logs. A well-formed incoming id (from an edge or gateway) is
  // kept; anything else is replaced so a client cannot forge correlation.
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && isValidRequestId(incoming) ? incoming : generateRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  if (env.CSP_MODE !== 'nonce') {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Strict CSP: a fresh nonce per request, handed to Next through the request
  // headers (it stamps its own scripts from the `Content-Security-Policy`
  // request header) and to the layout through `x-nonce`.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({
    nonce,
    connectOrigins: [env.NEXT_PUBLIC_API_URL ?? ''],
    isDev: isDevelopment,
  });
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Run on every path except API routes, Next internals, Vercel assets,
  // static metadata files, and any path with a static-asset extension.
  matcher: [
    '/((?!api|trpc|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|opengraph-image|twitter-image|apple-icon|icon|.*\\.(?:js|css|map|json|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|mp4|webm)).*)',
  ],
};
