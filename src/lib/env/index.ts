import { defineEnv, e } from '@teispace/env/next';

/**
 * Validated, coerced, frozen environment — the single source of truth.
 *
 * Powered by `@teispace/env` (split model with a leak guard):
 *
 * - `server` vars are validated and exposed only on the server. Reading one
 *   in a `'use client'` module **throws** instead of silently bundling a
 *   value. They are never listed in `runtimeEnv`: doing so hands the bundler
 *   the exact name we work to keep out of the browser.
 * - `client` vars must carry the `NEXT_PUBLIC_` prefix and are inlined by
 *   Next, so each must be spelled out in `runtimeEnv` (enforced at startup).
 * - `shared` vars are available everywhere. `NODE_ENV` lives here because the
 *   logger reads it on both sides.
 *
 * `devDefault` keeps production honest: the value is convenient locally and
 * in tests but required wherever `NODE_ENV=production`, so a misconfigured
 * deploy fails at startup instead of emitting localhost URLs.
 */
export const env = defineEnv({
  server: {
    DEFAULT_TIMEZONE: e
      .string()
      .default('UTC')
      .describe('IANA time zone for server-rendered date formatting (keeps SSR deterministic).'),
    DEFAULT_LOCALE: e
      .string()
      .default('en')
      .describe('Fallback locale when a request locale cannot be resolved.'),
    API_INTERNAL_URL: e
      .url()
      .optional()
      .describe(
        'Origin the server uses to reach the API (private network name in containers). Falls back to NEXT_PUBLIC_API_URL.',
      ),
    BUILD_STANDALONE: e
      .boolean()
      .default(false)
      .describe(
        'Emit the self-contained `.next/standalone` server (Docker). Leave off for `next start` and platform hosts.',
      ),
    CSP_MODE: e
      .enum(['static', 'nonce', 'off'])
      .default('static')
      .describe(
        "Content Security Policy strategy: 'static' keeps pages prerenderable, 'nonce' is strict but renders every page per request, 'off' sends no CSP.",
      ),
  },
  client: {
    NEXT_PUBLIC_API_URL: e
      .url()
      .optional()
      .describe('Bare origin of the backing API. Empty → relative/proxied requests.'),
    NEXT_PUBLIC_APP_URL: e
      .url()
      .devDefault('http://localhost:3000')
      .describe('Public URL this app is served from (OG/canonical URLs). Required in production.'),
  },
  shared: {
    NODE_ENV: e.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});

export type Env = typeof env;
