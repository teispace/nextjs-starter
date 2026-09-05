import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { API_RESPONSE_DATA_KEY, DEFAULT_TIMEOUT_MS, getApiBaseUrl } from '@/lib/config';
import { ApiException } from '@/lib/errors';
import type { QueryParams } from '@/types';
import { type AxiosClientOptions, type DataKey, left, type ResultAsync, right } from '@/types';

import { extractDataByKey, getRefreshManager } from '../client-utils';
import {
  extractRequestIdFromHeaderRecord,
  isServer,
  parseApiError,
  toSearchParams,
} from '../shared';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import { refreshAuthToken } from './token-refresh';

export class AxiosClient {
  private axios: AxiosInstance;
  private tokenStore: AxiosClientOptions['tokenStore'];
  private baseURL: string;

  constructor(options: AxiosClientOptions) {
    this.tokenStore = options.tokenStore;
    this.baseURL = options?.baseURL || getApiBaseUrl();

    this.axios = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      // Default timeout shared with the fetch client (axios native: 0 = off).
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        ...options.defaultHeaders,
      },
      // Use our shared serialiser so both clients produce identical query
      // strings — skips undefined/null/empty, repeats array values.
      paramsSerializer: (params) => toSearchParams(params as QueryParams).toString(),
    });

    setupRequestInterceptor(this.axios, this.tokenStore, options.cookieResolver);
    setupResponseInterceptor(
      this.axios,
      this.tokenStore,
      this.handleTokenRefresh.bind(this),
      options.onUnauthorized,
    );
  }

  private async handleTokenRefresh(): Promise<string | null> {
    // Never refresh on the server — see the fetch client for the full
    // rationale. The process-wide singleflight would be shared across users
    // during SSR, and the request interceptor forwards the current user's
    // cookies to the refresh call, so a successful server refresh here would
    // hand one user's token to every concurrent 401 queued behind it.
    if (isServer()) return null;

    // Shared per-baseURL singleflight — see getRefreshManager. Ensures the
    // fetch + axios clients never double-refresh the rotating refresh token.
    return getRefreshManager(this.baseURL).handleRefresh(() =>
      refreshAuthToken(this.tokenStore, this.axios),
    );
  }

  private extractData<T>(res: AxiosResponse, dataKey?: DataKey): T {
    return extractDataByKey<T>(res.data, dataKey);
  }

  private toApiException(err: unknown): ApiException {
    if (err instanceof AxiosError) {
      // No HTTP response → cancellation, timeout, or a raw network error.
      // Map the first two to typed exceptions so callers can branch with
      // `isCancelled()` / `isTimeout()`, mirroring the fetch client exactly.
      if (!err.response) {
        if (err.code === 'ERR_CANCELED') {
          return ApiException.cancelled(err.message || undefined, err.stack);
        }
        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
          return ApiException.timeout(err.message || undefined, err.stack);
        }
        return ApiException.network(err.message || 'Network error', err.stack);
      }

      const responseRequestId = extractRequestIdFromHeaderRecord(
        err.response.headers as Record<string, unknown> | undefined,
      );
      return parseApiError(err.response.data, err.response.status, responseRequestId, err.stack);
    }
    return ApiException.convertAny(err);
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    try {
      const res = await this.axios.get(url, config);
      return right(this.extractData<T>(res, dataKey));
    } catch (err) {
      return left(this.toApiException(err));
    }
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    try {
      const res = await this.axios.post(url, data, config);
      return right(this.extractData<T>(res, dataKey));
    } catch (err) {
      return left(this.toApiException(err));
    }
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    try {
      const res = await this.axios.put(url, data, config);
      return right(this.extractData<T>(res, dataKey));
    } catch (err) {
      return left(this.toApiException(err));
    }
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    try {
      const res = await this.axios.patch(url, data, config);
      return right(this.extractData<T>(res, dataKey));
    } catch (err) {
      return left(this.toApiException(err));
    }
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    try {
      const res = await this.axios.delete(url, config);
      return right(this.extractData<T>(res, dataKey));
    } catch (err) {
      return left(this.toApiException(err));
    }
  }
}

export function createAxiosClient(opts: AxiosClientOptions) {
  return new AxiosClient(opts);
}
