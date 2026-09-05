'use client';

/**
 * **Bundle sentinel** — do not delete.
 *
 * A `'use client'` module that imports the universal HTTP entry. If a future
 * change drags `next/headers` or `server-only` into that import graph, the
 * production build fails here with a clear error instead of shipping a
 * broken client bundle. It is mounted from the root layout so Next cannot
 * prune it, renders nothing, and references only the universal `http`
 * instance so no optional adapter is pulled into every page.
 */

import { http } from '@/lib/http';

// Uncommenting this line MUST break the build; it proves the fence holds.
// import * as __server__ from '@/lib/http/server';

export function HttpClientBundleSentinel(): null {
  if (typeof window !== 'undefined') {
    (window as unknown as { __http_sentinel__: unknown }).__http_sentinel__ = http.baseURL;
  }
  return null;
}
