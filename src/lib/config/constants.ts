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
 * Cookie-mode auth is the default: the server sets HttpOnly access/refresh
 * cookies on login and reads them back on each request. Flip to `true` to
 * switch to bearer-token mode — the token store + Authorization header
 * plumbing is already in place but inert by default.
 */
export const SAVE_AUTH_TOKENS = false;

export const isProduction = process.env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = process.env.NODE_ENV === Environment.DEVELOPMENT;
export const isTest = process.env.NODE_ENV === Environment.TEST;
