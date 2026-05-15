export type DataKey = string | null;

/**
 * Shape accepted by both clients' `params` option. Serialised via
 * `toSearchParams` so keys with `undefined`/`null`/`''` values are skipped
 * (lets backend defaults win) and array values become repeated keys.
 */
export type QueryParams = Record<string, unknown>;

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthInterceptor?: boolean;
    // Note: `params` is declared on AxiosRequestConfig natively as `any`.
    // We don't re-declare it here (module augmentation can only widen, not
    // narrow). Both clients' `paramsSerializer` runs all params through
    // `toSearchParams`, so the runtime contract matches `QueryParams`
    // regardless of the compile-time type.
  }
}

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  saveAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  saveRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface AxiosClientOptions {
  baseURL?: string;
  onUnauthorized?: () => void;
  tokenStore: TokenStore;
  /**
   * Headers merged into `axios.create({ headers })`. Use for static defaults
   * that should apply to every request from this client (e.g. an API-version
   * header). Per-request `Cookie` injection is handled by the interceptor,
   * not here.
   */
  defaultHeaders?: Record<string, string>;
}

export interface FetchClientOptions {
  baseURL?: string;
  onUnauthorized?: () => void;
  tokenStore: TokenStore;
  cache?: RequestCache;
  defaultOptions?: RequestInit;
}

export interface ExtendedRequestInit extends RequestInit {
  _retry?: boolean;
  _skipAuthInterceptor?: boolean;
  _authToken?: string;
  /**
   * Typed query params. Appended to the URL via `toSearchParams` after
   * any literal `?...` already in the path. Skips `undefined`/`null`/`''`.
   */
  params?: QueryParams;
}

export interface InterceptorResult {
  shouldRetry: boolean;
  shouldReject: boolean;
  newToken?: string;
}

export interface RefreshState {
  isRefreshing: boolean;
  queue: Array<(token: string | null) => void>;
  attempts: number;
  lastAttempt: number;
}
