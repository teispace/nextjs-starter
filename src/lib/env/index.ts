import { defineEnv, e } from '@teispace/env/next';

/**
 * Validated, coerced, frozen environment — the single source of truth.
 *
 * Powered by `@teispace/env` (the split/leak-guard model):
 *
 * - `server` vars are validated and exposed only on the server. Reading one in
 *   a client (`'use client'`) module **throws** instead of silently bundling a
 *   value — so a future refactor can't leak server config into the browser.
 * - `client` vars must carry the `NEXT_PUBLIC_` prefix (enforced at define
 *   time) and are inlined into the browser bundle by Next.
 * - `shared` vars are available everywhere with no prefix rule. `NODE_ENV`
 *   lives here because the logger reads `env.NODE_ENV` on both server and
 *   client — a `server`-group var would trip the leak guard there.
 *
 * `runtimeEnv` lists every key explicitly: Next statically replaces
 * `process.env.X` only at literal access sites, so a dynamic read in the
 * package can't see client vars unless they're spelled out here.
 *
 * Invalid/malformed config fails fast at module load with one aggregated,
 * secret-redacted error listing every offending variable.
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
  },
  client: {
    NEXT_PUBLIC_API_URL: e
      .url()
      .optional()
      .describe('Bare origin of the backing API. Empty → relative/proxied requests.'),
    NEXT_PUBLIC_APP_URL: e
      .url()
      .default('http://localhost:3000')
      .describe('Public URL this app is served from (OG/canonical URLs).'),
  },
  shared: {
    NODE_ENV: e.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: {
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});

export type Env = typeof env;
