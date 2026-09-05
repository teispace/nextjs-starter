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
}
