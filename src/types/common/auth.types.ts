/**
 * Auth payload shapes returned by the backend.
 *
 * Mirrors `AuthResponseDto` / `RefreshTokensResponseDto` in the NestJS starter
 * (`src/modules/auth/dto/auth-response.dto.ts`). Keep field names in sync.
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
