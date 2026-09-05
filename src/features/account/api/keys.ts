/**
 * Query keys owned by the feature. Everything under `accountKeys.all` can be
 * invalidated at once; narrower keys target one resource.
 */
export const accountKeys = {
  all: ['account'] as const,
  signInCapabilities: () => [...accountKeys.all, 'sign-in-capabilities'] as const,
} as const;
