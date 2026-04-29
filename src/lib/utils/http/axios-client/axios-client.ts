import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { API_RESPONSE_DATA_KEY } from '@/lib/config';
import { env } from '@/lib/env';
import { ApiException } from '@/lib/errors';
import { type AxiosClientOptions, type DataKey, left, type ResultAsync, right } from '@/types';

import { extractDataByKey, TokenRefreshManager } from '../client-utils';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import { refreshAuthToken } from './token-refresh';

export class AxiosClient {
  private axios: AxiosInstance;
  private tokenStore: AxiosClientOptions['tokenStore'];
  private refreshManager = new TokenRefreshManager();

  constructor(options: AxiosClientOptions) {
    this.tokenStore = options.tokenStore;

    this.axios = axios.create({
      baseURL: options?.baseURL || env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    setupRequestInterceptor(this.axios, this.tokenStore);
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
      const body = err.response?.data;
      const exception = ApiException.fromResponse(
        {
          status: body?.status ?? err.response?.status,
          message: body?.message || err.message,
          code: body?.code,
          errors: body?.errors,
          data: body?.data,
          path: body?.path,
        },
        err.response?.status ?? 0,
      );
      if (err.stack) exception.stack = err.stack;
      return exception;
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
