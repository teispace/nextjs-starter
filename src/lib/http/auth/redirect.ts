import { AppPaths } from '@/lib/config/app-paths';
import { isBrowser } from '@/lib/runtime';

/** Send the browser to sign-in, remembering where it was. No-op on the server. */
export const redirectToLogin = (): void => {
  if (!isBrowser()) return;
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${AppPaths.auth.login}?redirectTo=${returnTo}`);
};
