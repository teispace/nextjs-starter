import axios, { type AxiosInstance, isAxiosError } from 'axios';

import type { Adapter } from '../types';

/**
 * Axios as a transport behind the same contract as `fetchAdapter`.
 *
 * Kept as an option for teams that want axios's interceptor ecosystem or
 * upload progress; it is not part of the universal entry, so it only reaches
 * a bundle when imported. The adapter asks axios for raw bytes and wraps them
 * in a standard `Response`, so every downstream step (envelope parsing,
 * retries, validation) is shared with fetch and tested once.
 *
 * ```ts
 * import { createHttpClient } from '@/lib/http';
 * import { axiosAdapter } from '@/lib/http/adapters/axios';
 *
 * export const http = createHttpClient({ adapter: axiosAdapter() });
 * ```
 */
export const axiosAdapter = (instance: AxiosInstance = axios.create()): Adapter => {
  return async (request) => {
    try {
      const res = await instance.request<ArrayBuffer>({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        data: request.body,
        signal: request.signal,
        withCredentials: request.credentials === 'include',
        responseType: 'arraybuffer',
        validateStatus: () => true,
        // Timeouts and cancellation come from the composed AbortSignal.
        timeout: 0,
      });
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) for (const v of value) headers.append(key, String(v));
        else if (value !== undefined && value !== null) headers.set(key, String(value));
      }
      const body = res.status === 204 || res.status === 205 || res.status === 304 ? null : res.data;
      return new Response(body, { status: res.status, statusText: res.statusText, headers });
    } catch (error) {
      // Surface aborts the way fetch does so the shared classifier applies.
      if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      throw error;
    }
  };
};
