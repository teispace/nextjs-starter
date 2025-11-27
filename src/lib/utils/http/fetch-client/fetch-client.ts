import { API_RESPONSE_DATA_KEY } from '@/lib/config';
import { ApiException } from '@/lib/errors';
import { DataKey, FetchClientOptions, left, ResultAsync, right } from '@/types';
import { extractDataByKey, TokenRefreshManager } from '../client-utils';
import { applyRequestInterceptors, applyResponseInterceptors } from './interceptors';
import { refreshAuthToken } from './token-refresh';

export class FetchClient {
  private baseURL: string;
  private tokenStore: FetchClientOptions['tokenStore'];
  private defaultOptions: RequestInit;
  private onUnauthorized?: () => void;
  private refreshManager = new TokenRefreshManager();

  constructor(options: FetchClientOptions) {
    this.baseURL = options?.baseURL || process.env.NEXT_PUBLIC_API_URL || '';
    this.tokenStore = options.tokenStore;
    this.onUnauthorized = options.onUnauthorized;

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

  private toApiException(error: unknown, response?: Response): ApiException {
    if (error instanceof ApiException) {
      return error;
    }

    if (response) {
      return new ApiException({
        status: response.status,
        message:
          typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : `Request failed with status ${response.status}`,
        errors:
          typeof error === 'object' && error !== null && 'errors' in error
            ? (error as { errors: Record<string, string>[] }).errors
            : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      });
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

  private buildURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const normalizedURL = url.startsWith('/') ? url.slice(1) : url;
    const normalizedBase = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    return `${normalizedBase}/${normalizedURL}`;
  }

  private async request<T>(
    url: string,
    options: RequestInit & { _retry?: boolean; _skipAuthInterceptor?: boolean } = {},
    dataKey?: DataKey,
  ): ResultAsync<T> {
    const fullURL = this.buildURL(url);

    try {
      const interceptedOptions = await applyRequestInterceptors(
        options,
        this.tokenStore,
        this.defaultOptions,
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
        return this.request<T>(url, { ...options, _retry: true }, dataKey);
      }

      if (interceptResult.shouldReject) {
        const errorData = responseData as { message?: string; errors?: Record<string, string>[] };
        return left(
          new ApiException({
            status: response.status,
            message: errorData?.message || 'Unauthorized',
            errors: errorData?.errors,
          }),
        );
      }

      if (!response.ok) {
        const errorData = responseData as { message?: string; errors?: Record<string, string>[] };
        return left(
          new ApiException({
            status: response.status,
            message: errorData?.message || `Request failed with status ${response.status}`,
            errors: errorData?.errors,
          }),
        );
      }

      return right(extractDataByKey<T>(responseData, dataKey));
    } catch (error) {
      return left(this.toApiException(error));
    }
  }

  async get<T>(
    url: string,
    options?: RequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'GET' }, dataKey);
  }

  async post<T>(
    url: string,
    data?: unknown,
    options?: RequestInit,
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
    options?: RequestInit,
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
    options?: RequestInit,
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
    options?: RequestInit,
    dataKey: DataKey = API_RESPONSE_DATA_KEY,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' }, dataKey);
  }
}

export function createFetchClient(options: FetchClientOptions): FetchClient {
  return new FetchClient(options);
}
