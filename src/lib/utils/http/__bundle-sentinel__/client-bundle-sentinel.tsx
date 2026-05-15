'use client';

/**
 * **Bundle sentinel** — do not delete.
 *
 * This file exists solely to make `yarn build` (and CI) catch any future
 * regression where the HTTP layer's server-only code (`next/headers`,
 * `server-only`) accidentally leaks into the client bundle.
 *
 * Mechanism:
 * 1. The file is marked `'use client'`, so its entire import graph must be
 *    valid for the client bundle.
 * 2. It imports every public symbol from `@/lib/utils/http`. If any of
 *    those drag a server-only module into the client graph, the build
 *    fails with the exact error the original v1 layer hit.
 * 3. It's referenced from `src/app/[locale]/layout.tsx` so the route tree
 *    pulls it into a real production build (Next.js prunes unreferenced
 *    files; a dangling import wouldn't be a regression test).
 *
 * The component renders nothing — its sole purpose is to exist in the
 * bundle graph. Remove only if you're certain the import-graph isolation
 * is enforced by some other mechanism (e.g. an ESLint rule on `'use
 * client'` files).
 */

import {
  axiosClient,
  createAxiosClient,
  createFetchClient,
  fetchClient,
  toSearchParams,
} from '@/lib/utils/http';

// SENTINEL CHECK — uncommenting this line MUST break the build, proving
// the universal entry is fenced off from the server-only entry. Used
// only to validate the regression gate; keep commented in `main`.
// import * as __server__ from '@/lib/utils/http/server';

// Reference each export so tree-shaking can't elide them. The conditional
// is always false at runtime, so this is a zero-cost compile-time check.
const __sentinel__ = {
  axiosClient,
  createAxiosClient,
  createFetchClient,
  fetchClient,
  toSearchParams,
};

export function HttpClientBundleSentinel(): null {
  // The reference must reach the runtime so the bundler can't tree-shake it
  // away. Stash on a global without invoking `console` (Biome's noConsole
  // would otherwise flag this file). The assignment is a no-op in production.
  if (typeof window !== 'undefined') {
    (window as unknown as { __http_sentinel__: unknown }).__http_sentinel__ = __sentinel__;
  }
  return null;
}
