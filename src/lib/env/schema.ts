import { z } from 'zod';

/**
 * Convert empty/whitespace-only strings to `undefined` so zod defaults apply
 * instead of being pre-empted by an empty string from `.env`.
 */
export const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Central environment schema. Every env var the app reads MUST be declared here.
 *
 * - `NEXT_PUBLIC_*` vars are exposed to the browser bundle.
 * - Other vars stay server-side. When you add server-only secrets, branch
 *   `parseEnv` to skip them on the client (see note in `loader.ts`).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_API_URL: z
    .preprocess(emptyStringToUndefined, z.url().optional())
    .describe('Base URL for the backing API. Empty means relative/proxied requests.'),

  NEXT_PUBLIC_APP_URL: z
    .preprocess(emptyStringToUndefined, z.url().default('http://localhost:3000'))
    .describe('Public URL this app is served from (used for OG/canonical URLs).'),

  DEFAULT_TIMEZONE: z
    .preprocess(emptyStringToUndefined, z.string().default('UTC'))
    .describe(
      'IANA time-zone name used by next-intl for server-rendered date formatting. ' +
        'Must match the TZ used when hydrating on the client.',
    ),

  DEFAULT_LOCALE: z
    .preprocess(emptyStringToUndefined, z.string().default('en'))
    .describe('Fallback locale used when a request locale cannot be resolved.'),
});

export type Env = z.infer<typeof envSchema>;
