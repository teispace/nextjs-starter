import { Environment } from '../enums';

/**
 * URI version prefix the backend mounts under (`/api/v{n}`).
 *
 * Owned by the frontend because the backend uses Nest URI versioning — the
 * version is part of the **contract**, not the deployment. Bumping it here is
 * a single-line change; pushing it into env means every environment has to be
 * touched in lockstep.
 *
 * Use `getApiBaseUrl()` from `./api-url` to compose the full base URL.
 */
export const API_PREFIX = '/api/v1';

export const API_RESPONSE_DATA_KEY = 'data';

/**
 * Cookie-mode auth is the default: backend sets HttpOnly access/refresh
 * cookies on login and reads them via Passport extractors. Flip to `true`
 * to switch to bearer-token mode — the token store + Authorization header
 * plumbing is already in place but inert by default.
 */
export const SAVE_AUTH_TOKENS = false;

export const isProduction = process.env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = process.env.NODE_ENV === Environment.DEVELOPMENT;
export const isTest = process.env.NODE_ENV === Environment.TEST;
