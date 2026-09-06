/**
 * Auth payload shapes returned by the API. Sessions are cookie-based, so
 * tokens never reach application code; only the user profile is modelled.
 * Adjust the fields to match the auth contract your API exposes.
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isEmailVerified: boolean;
  /**
   * Claims the API sends when it models them. Both are optional because many
   * APIs model neither, and an absent claim grants nothing: every check in
   * `@/lib/auth` fails closed. The API remains the authority on what a
   * request may do; these decide which screen a visitor sees.
   */
  roles?: string[];
  permissions?: string[];
}
