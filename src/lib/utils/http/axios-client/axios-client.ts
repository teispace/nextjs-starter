import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { API_RESPONSE_DATA_KEY, getApiBaseUrl } from '@/lib/config';
import { ApiException } from '@/lib/errors';
import type { QueryParams } from '@/types';
import { type AxiosClientOptions, type DataKey, left, type ResultAsync, right } from '@/types';

import { extractDataByKey, TokenRefreshManager } from '../client-utils';
import { extractRequestIdFromHeaderRecord, parseApiError, toSearchParams } from '../shared';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import { refreshAuthToken } from './token-refresh';

export class AxiosClient {
  private axios: AxiosInstance;
  private tokenStore: AxiosClientOptions['tokenStore'];
  private refreshManager = new TokenRefreshManager();

  constructor(options: AxiosClientOptions) {
    this.tokenStore = options.tokenStore;

    this.axios = axios.create({
      baseURL: options?.baseURL || getApiBaseUrl(),
      withCredentials: true,
      timeout: 10000,
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
    return this.refreshManager.handleRefresh(() => refreshAuthToken(this.tokenStore, this.axios));
  }

  private extractData<T>(res: AxiosResponse, dataKey?: DataKey): T {
    return extractDataByKey<T>(res.data, dataKey);
  }

  private toApiException(err: unknown): ApiException {
    if (err instanceof AxiosError) {
      const responseRequestId = extractRequestIdFromHeaderRecord(
        err.response?.headers as Record<string, unknown> | undefined,
      );
      return parseApiError(
        err.response?.data,
        err.response?.status ?? 0,
        responseRequestId,
        err.stack,
      );
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
