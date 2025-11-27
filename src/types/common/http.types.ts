export type DataKey = string | null;

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthInterceptor?: boolean;
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
}

export interface InterceptorResult {
  shouldRetry: boolean;
  shouldReject: boolean;
}

export interface RefreshState {
  isRefreshing: boolean;
  queue: Array<(token: string | null) => void>;
  attempts: number;
  lastAttempt: number;
}
