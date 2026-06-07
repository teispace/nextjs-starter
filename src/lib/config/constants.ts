import { Environment } from '../enums';

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

/**
 * Cookie-mode auth is the default: the server sets HttpOnly access/refresh
 * cookies on login and reads them back on each request. Flip to `true` to
 * switch to bearer-token mode — the token store + Authorization header
 * plumbing is already in place but inert by default.
 */
export const SAVE_AUTH_TOKENS = false;

export const isProduction = process.env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = process.env.NODE_ENV === Environment.DEVELOPMENT;
export const isTest = process.env.NODE_ENV === Environment.TEST;
