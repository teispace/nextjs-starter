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
 * typed timeout (`ApiException.isTimeout()`) instead of waiting forever.
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
 * Auth-token storage mode, derived from NODE_ENV.
 *
 * `true` → bearer/localStorage mode: the access/refresh tokens are persisted in
 * (obfuscated) local storage and sent as `Authorization: Bearer`. This exposes
 * tokens to any XSS, so it is allowed ONLY in development/test for ergonomics.
 *
 * `false` → cookie mode: the server sets HttpOnly access/refresh cookies on
 * login and reads them back each request; the token store is inert.
 *
 * The gate is a positive allowlist of exactly {development, test}. Everything
 * else falls through to the safe cookie mode — and because `next build` forces
 * NODE_ENV to "production" for every deployed build (including staging), all
 * deployed environments get cookie mode automatically. The value is computed
 * once at frozen module load, so no runtime path can flip bearer mode on in a
 * deployed environment.
 */
const BEARER_ALLOWED_ENVS = new Set<string>([Environment.DEVELOPMENT, Environment.TEST]);
export const SAVE_AUTH_TOKENS = BEARER_ALLOWED_ENVS.has(env.NODE_ENV);
