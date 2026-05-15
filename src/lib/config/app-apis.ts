/**
 * Backend API endpoint paths.
 *
 * Paths are **relative to the API base** (which already includes `/api/v{n}`
 * via `getApiBaseUrl()`), so we don't repeat the version prefix here.
 *
 * Mirrors `AppPaths.auth` in the NestJS starter — keep in sync when the
 * backend renames routes.
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
