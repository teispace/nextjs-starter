/**
 * Server-side API endpoint paths.
 *
 * Paths are **relative to the API base** (which already includes `/api/v{n}`
 * via `getApiBaseUrl()`), so we don't repeat the version prefix here.
 *
 * The defaults below are illustrative — replace them with the routes your
 * own API exposes.
 */
export const AppApis = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    capabilities: '/auth/login/capabilities',
  },
} as const;
