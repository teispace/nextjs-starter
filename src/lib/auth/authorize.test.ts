import { describe, expect, it } from 'vitest';

import type { AuthUser } from '@/types';

import { hasEveryPermission, hasPermission, hasRole } from './authorize';

const user = (claims: Partial<AuthUser>): AuthUser => ({
  id: '1',
  email: 'a@b.c',
  username: 'a',
  isEmailVerified: true,
  ...claims,
});

describe('claim checks', () => {
  it('matches any of the roles asked for', () => {
    const admin = user({ roles: ['admin'] });
    expect(hasRole(admin, 'admin')).toBe(true);
    expect(hasRole(admin, 'editor', 'admin')).toBe(true);
    expect(hasRole(admin, 'editor')).toBe(false);
  });

  it('matches any permission, or every one when asked', () => {
    const editor = user({ permissions: ['invoice.read', 'invoice.write'] });
    expect(hasPermission(editor, 'invoice.read')).toBe(true);
    expect(hasPermission(editor, 'invoice.delete', 'invoice.read')).toBe(true);
    expect(hasEveryPermission(editor, 'invoice.read', 'invoice.write')).toBe(true);
    expect(hasEveryPermission(editor, 'invoice.read', 'invoice.delete')).toBe(false);
  });

  // An API that models no claims must not accidentally grant them, and neither
  // must a signed-out visitor.
  it('fails closed for an absent claim, an empty list, and no user', () => {
    expect(hasRole(user({}), 'admin')).toBe(false);
    expect(hasPermission(user({ permissions: [] }), 'invoice.read')).toBe(false);
    expect(hasEveryPermission(user({ permissions: ['a'] })).valueOf()).toBe(false);
    expect(hasRole(null, 'admin')).toBe(false);
    expect(hasPermission(null, 'invoice.read')).toBe(false);
  });
});
