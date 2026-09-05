/**
 * Client-safe public surface. Server-only pieces (DAL, actions' server
 * imports) are exported from `./server` so a `'use client'` module can
 * import this barrel without dragging `server-only` into the bundle.
 */
export { signOut } from './api/actions';
export { accountKeys } from './api/keys';
export { signInCapabilitiesQuery, useSignInCapabilities } from './api/queries';
export {
  DEFAULT_SIGN_IN_CAPABILITIES,
  type SignInCapabilities,
  type SignInProvider,
  signInCapabilitiesSchema,
} from './api/schema';
export { SignInOptions } from './components/SignInOptions';
export { SignOutButton } from './components/SignOutButton';
