import { Environment } from '../enums';
import { env } from '../env';

/**
 * URI version prefix mounted by the API (`/api/v{n}`).
 *
 * Treated as part of the contract, not the deployment — bumping it here is
 * a single-line change. Pushing it into env would mean every environment
 * has to be updated in lockstep, which is rarely worth it.
 *
 * Use `getApiBaseUrl()` from `./api-url` to compose the full base URL.
 */
export const API_PREFIX = '/api/v1';

export const API_RESPONSE_DATA_KEY = 'data';

/**
 * Default per-request timeout (ms) applied by both HTTP clients when the
 * caller doesn't specify one. Mirrors axios's historical 10s default so the
 * fetch and axios clients behave identically. A hung upstream now fails as a
 * typed timeout (`HttpError.isTimeout()`) instead of waiting forever.
 *
 * Override per request via the `timeout` option, or pass `0` to disable the
 * timeout for a specific long-poll / streaming call.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

// Read NODE_ENV through the validated, typed env (shared group) so there's a
// single source of truth rather than scattered raw `process.env` reads.
export const isProduction = env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = env.NODE_ENV === Environment.DEVELOPMENT;
export const isTest = env.NODE_ENV === Environment.TEST;

/**
 * Whether the public app URL is https. HSTS and `upgrade-insecure-requests`
 * only make sense on that origin: over plain http (a local production
 * build, an internal preview) browsers such as WebKit would otherwise
 * upgrade every asset request to https and the page would never hydrate.
 */
export const servesHttps = env.NEXT_PUBLIC_APP_URL.startsWith('https:');
