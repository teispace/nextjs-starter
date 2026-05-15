import { API_RESPONSE_DATA_KEY, getApiBaseUrl } from '@/lib/config';
import { ApiException } from '@/lib/errors';
import {
  type CookieResolver,
  type DataKey,
  type ExtendedRequestInit,
  type FetchClientOptions,
  left,
  type ResultAsync,
  right,
} from '@/types';

import { extractDataByKey, TokenRefreshManager } from '../client-utils';
import { extractRequestIdFromHeaders, parseApiError, toSearchParams } from '../shared';
import { applyRequestInterceptors, applyResponseInterceptors } from './interceptors';
import { refreshAuthToken } from './token-refresh';

export class FetchClient {
  private baseURL: string;
  private tokenStore: FetchClientOptions['tokenStore'];
  private defaultOptions: RequestInit;
  private onUnauthorized?: () => void;
  private cookieResolver?: CookieResolver;
  private refreshManager = new TokenRefreshManager();

  constructor(options: FetchClientOptions) {
    this.baseURL = options?.baseURL || getApiBaseUrl();
    this.tokenStore = options.tokenStore;
    this.onUnauthorized = options.onUnauthorized;
    this.cookieResolver = options.cookieResolver;

    this.defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: options.cache || 'no-store',
      ...options.defaultOptions,
    };
  }

  private async handleTokenRefresh(): Promise<string | null> {
    return this.refreshManager.handleRefresh(() => refreshAuthToken(this.tokenStore, this.baseURL));
  }

  private toApiException(error: unknown, response?: Response, body?: unknown): ApiException {
    if (error instanceof ApiException) return error;

    if (response) {
      const exception = parseApiError(
        body ?? error,
        response.status,
        extractRequestIdFromHeaders(response.headers),
        error instanceof Error ? error.stack : undefined,
      );
      return exception;
    }

    if (error instanceof Error) {
      return new ApiException({
        status: 0,
        message: error.message || 'Network error',
        stack: error.stack,
      });
    }

    return ApiException.convertAny(error);
  }

  private buildURL(url: string, params?: ExtendedRequestInit['params']): string {
    const absolute =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

    if (!params) return absolute;

    const search = toSearchParams(params).toString();
    if (!search) return absolute;

    const separator = absolute.includes('?') ? '&' : '?';
    return `${absolute}${separator}${search}`;
  }

  private async request<T>(
    url: string,
    options: ExtendedRequestInit = {},
    dataKey?: DataKey,
  ): ResultAsync<T> {
    const { params, ...fetchOptions } = options;
    const fullURL = this.buildURL(url, params);

    try {
      const interceptedOptions = await applyRequestInterceptors(
        fetchOptions,
        this.tokenStore,
        this.defaultOptions,
        this.cookieResolver,
      );

      const response = await fetch(fullURL, interceptedOptions);

      const contentType = response.headers.get('Content-Type') || '';
      let responseData: unknown;

      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else if (contentType.includes('text/')) {
        responseData = await response.text();
      } else {
        responseData = await response.blob();
      }

      const interceptResult = await applyResponseInterceptors(
        response,
        responseData,
        options,
        this.tokenStore,
        this.handleTokenRefresh.bind(this),
        this.onUnauthorized,
      );

      if (interceptResult.shouldRetry) {
        return this.request<T>(
          url,
          { ...options, _retry: true, _authToken: interceptResult.newToken },
          dataKey,
        );
      }

      if (interceptResult.shouldReject || !response.ok) {
        return left(this.toApiException(undefined, response, responseData));
      }

      return right(extractDataByKey<T>(responseData, dataKey));
    } catch (error) {
      return left(this.toApiException(error));
    }
  }

  async get<T>(
    url: string,
    options?: ExtendedRequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'GET' }, dataKey);
  }

  async post<T>(
    url: string,
    data?: unknown,
    options?: ExtendedRequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(
      url,
      {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      dataKey,
    );
  }

  async put<T>(
    url: string,
    data?: unknown,
    options?: ExtendedRequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(
      url,
      {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      dataKey,
    );
  }

  async patch<T>(
    url: string,
    data?: unknown,
    options?: ExtendedRequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(
      url,
      {
        ...options,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      dataKey,
    );
  }

  async delete<T>(
    url: string,
    options?: ExtendedRequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' }, dataKey);
  }
}

export function createFetchClient(options: FetchClientOptions): FetchClient {
  return new FetchClient(options);
}
