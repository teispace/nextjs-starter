import 'server-only';

import { forbidden } from 'next/navigation';

import type { AuthUser } from '@/types';

import { requireUser } from './session';

/**
 * Authorization helpers.
 *
 * The API owns authorization: it decides what a request may read or change,
 * and it must reject anything it should not serve. These helpers decide what
 * a *screen* shows, so a visitor sees the right page instead of a wall of
 * failed requests. Never treat a check here as the enforcement point.
 *
 * Roles and permissions are optional on `AuthUser` because plenty of APIs
 * model neither. A user with neither field simply fails every check, which
 * is the safe direction: nothing is granted by an absent claim.
 */

const claims = (user: AuthUser | null, key: 'roles' | 'permissions'): readonly string[] =>
  (user?.[key] as readonly string[] | undefined) ?? [];

/** Does the user hold at least one of these roles? */
export const hasRole = (user: AuthUser | null, ...roles: readonly string[]): boolean => {
  const held = claims(user, 'roles');
  return roles.some((role) => held.includes(role));
};

/** Does the user hold at least one of these permissions? */
export const hasPermission = (
  user: AuthUser | null,
  ...permissions: readonly string[]
): boolean => {
  const held = claims(user, 'permissions');
  return permissions.some((permission) => held.includes(permission));
};

/** Does the user hold every one of these permissions? */
export const hasEveryPermission = (
  user: AuthUser | null,
  ...permissions: readonly string[]
): boolean => {
  const held = claims(user, 'permissions');
  return permissions.length > 0 && permissions.every((permission) => held.includes(permission));
};

/**
 * Signed in and holding one of `roles`, or the route renders `forbidden.tsx`.
 * Signed-out visitors are sent to sign in first: being anonymous is a
 * different problem from lacking a role, and they get different pages.
 */
export const requireRole = async (
  roles: readonly string[],
  returnTo?: string,
): Promise<AuthUser> => {
  const user = await requireUser(returnTo);
  if (!hasRole(user, ...roles)) forbidden();
  return user;
};

/** Signed in and holding one of `permissions`, or the route renders `forbidden.tsx`. */
export const requirePermission = async (
  permissions: readonly string[],
  returnTo?: string,
): Promise<AuthUser> => {
  const user = await requireUser(returnTo);
  if (!hasPermission(user, ...permissions)) forbidden();
  return user;
};
