/**
 * Auth payload shapes returned by the API.
 *
 * Adjust the fields here to match the auth contract your API exposes.
 */

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isEmailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export type RefreshTokensResponse = AuthTokens;
