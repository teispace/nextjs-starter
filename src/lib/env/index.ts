import { type Env, envSchema } from './schema';
import { validateConfig } from './validate';

/**
 * Parse `process.env` against the schema once and cache the result.
 *
 * Next.js inlines `NEXT_PUBLIC_*` vars at build time, so the schema is
 * evaluated identically on server and client. Add server-only secrets
 * to a separate `serverEnvSchema` + `serverEnv` export when needed —
 * keeping this module import-safe from client components.
 */
let cached: Env | null = null;

function readRawEnv(): Record<string, unknown> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
  };
}

function loadEnv(): Env {
  return validateConfig(envSchema, readRawEnv(), 'environment variables');
}

export const env: Env = (() => {
  if (!cached) cached = loadEnv();
  return cached;
})();

export type { Env } from './schema';
export { envSchema } from './schema';
