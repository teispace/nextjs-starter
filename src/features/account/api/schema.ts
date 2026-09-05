import { z } from 'zod';

/**
 * Wire contracts for the account feature. The schema is the source of truth:
 * responses are validated against it at the transport, and the TypeScript
 * types are inferred from it, so the two cannot drift.
 */
export const signInProviderSchema = z.enum(['password', 'magic-link', 'google', 'github']);
export type SignInProvider = z.infer<typeof signInProviderSchema>;

export const signInCapabilitiesSchema = z.object({
  providers: z.array(signInProviderSchema).min(1),
  allowSignUp: z.boolean().default(true),
});
export type SignInCapabilities = z.infer<typeof signInCapabilitiesSchema>;

export const DEFAULT_SIGN_IN_CAPABILITIES: SignInCapabilities = {
  providers: ['password'],
  allowSignUp: true,
};

export const signOutOutputSchema = z.object({ signedOut: z.literal(true) });
export type SignOutOutput = z.infer<typeof signOutOutputSchema>;
