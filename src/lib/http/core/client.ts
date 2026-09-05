import { API_RESPONSE_DATA_KEY, DEFAULT_TIMEOUT_MS, getApiBaseUrl } from '@/lib/config';
import { HttpError, ResponseValidationError } from '@/lib/errors';
import { fail, ok, type ResultAsync } from '@/types';

import { fetchAdapter } from '../adapters/fetch';
import {
  abortToHttpError,
  buildAbortSignal,
  extractRequestIdFromHeaders,
  generateRequestId,
  httpErrorFromResponse,
  isRetryableMethod,
  isRetryableStatus,
  isServer,
  isValidRequestId,
  mergeHeaders,
  prepareBody,
  REQUEST_ID_HEADER,
  readResponseBody,
  resolveRetryPolicy,
  retryDelayMs,
  sleep,
  toSearchParams,
} from '../shared';
import type {
  Adapter,
  AuthPolicy,
  DataKey,
  HttpClientOptions,
  HttpMethod,
  NormalizedRequest,
  QueryParams,
  RequestOptions,
  RetryPolicy,
} from '../types';

const isAbsolute = (url: string): boolean => /^https?:\/\//i.test(url);

/** Unwrap `{ data: ... }` style envelopes; `null` key returns the body untouched. */
export const extractDataByKey = <T>(body: unknown, dataKey: DataKey): T => {
  if (dataKey === null) return body as T;
  if (typeof body === 'object' && body !== null && dataKey in body) {
    return (body as Record<string, unknown>)[dataKey] as T;
  }
  return body as T;
};

type Attempt =
  | { kind: 'response'; response: Response; body: unknown }
  | { kind: 'error'; error: unknown };

/**
 * Transport-agnostic HTTP client. Every call resolves to a `Result`: nothing
 * throws, every failure is an `HttpError` with a status and a code.
 *
 * Responsibilities, in order per request: URL and query composition, header
 * merging, request-id stamping, server cookie forwarding, body preparation,
 * the adapter call, bounded retries for transient failures, a single session
 * refresh and replay on 401 (browser only), envelope unwrapping, and optional
 * schema validation.
 */
export class HttpClient {
  readonly baseURL: string;
  private readonly adapter: Adapter;
  private readonly timeout: number;
  private readonly headers: HeadersInit | undefined;
  private readonly credentials: RequestCredentials;
  private readonly cache: RequestCache | undefined;
  private readonly retry: Partial<RetryPolicy> | false | undefined;
  private readonly dataKey: DataKey;
  private readonly cookieResolver: HttpClientOptions['cookieResolver'];
  private readonly requestIdResolver: HttpClientOptions['requestIdResolver'];
  private readonly auth: AuthPolicy;

  constructor(options: HttpClientOptions = {}) {
    this.baseURL = options.baseURL ?? getApiBaseUrl();
    this.adapter = options.adapter ?? fetchAdapter;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.headers = options.headers;
    this.credentials = options.credentials ?? 'include';
    this.cache = options.cache;
    this.retry = options.retry;
    this.dataKey = options.dataKey === undefined ? API_RESPONSE_DATA_KEY : options.dataKey;
    this.cookieResolver = options.cookieResolver;
    this.requestIdResolver = options.requestIdResolver;
    this.auth = options.auth ?? {};
  }

  buildURL(url: string, params?: QueryParams): string {
    const absolute = isAbsolute(url)
      ? url
      : `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    if (!params) return absolute;
    const search = toSearchParams(params).toString();
    if (!search) return absolute;
    return `${absolute}${absolute.includes('?') ? '&' : '?'}${search}`;
  }

  get<T>(url: string, options?: Omit<RequestOptions<T>, 'method' | 'body'>): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  head(url: string, options?: Omit<RequestOptions<void>, 'method' | 'body'>): ResultAsync<void> {
    return this.request<void>(url, { ...options, method: 'HEAD', dataKey: null });
  }

  post<T>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions<T>, 'method' | 'body'>,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  put<T>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions<T>, 'method' | 'body'>,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  patch<T>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions<T>, 'method' | 'body'>,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }

  delete<T = void>(
    url: string,
    options?: Omit<RequestOptions<T>, 'method' | 'body'>,
  ): ResultAsync<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  async request<T>(url: string, options: RequestOptions<T> = {}): ResultAsync<T> {
    const method: HttpMethod = options.method ?? 'GET';
    const fullURL = this.buildURL(url, options.params);
    const policy = resolveRetryPolicy(this.retry, options.retry);
    // The timeout is a total budget: retries and the post-refresh replay all
    // run inside it, so a hung upstream cannot multiply the wait.
    const { signal, isTimeout } = buildAbortSignal(options.signal, options.timeout ?? this.timeout);
    const canRefresh = !(options.skipAuth || isServer()) && this.auth.refresh !== undefined;
    const headers = await this.resolveHeaders(options);

    let attempt = 0;
    let refreshed = false;

    for (;;) {
      const outcome = await this.attempt(fullURL, method, options, signal, headers);

      if (outcome.kind === 'error') {
        const error = this.classify(outcome.error, isTimeout(), options.signal);
        const retryable =
          policy !== null &&
          error.isNetworkError() &&
          policy.retryOnNetworkError &&
          isRetryableMethod(policy, method) &&
          attempt < policy.retries;
        if (!retryable) return fail(error);
        const waited = await this.backoff(policy, attempt, null, signal, isTimeout, options.signal);
        if (waited) return fail(waited);
        attempt++;
        continue;
      }

      const { response, body } = outcome;
      const requestId = extractRequestIdFromHeaders(response.headers);

      if (response.status === 401 && canRefresh && !refreshed) {
        refreshed = true;
        // `canRefresh` guarantees the policy has a refresh function.
        const renewed = await (this.auth.refresh as NonNullable<AuthPolicy['refresh']>)();
        if (renewed) continue;
        options.onResponse?.(response);
        const error = httpErrorFromResponse(body, 401, requestId);
        this.auth.onUnauthorized?.(error);
        return fail(error);
      }

      if (!response.ok) {
        const retryable =
          policy !== null &&
          isRetryableStatus(policy, response.status) &&
          isRetryableMethod(policy, method) &&
          attempt < policy.retries;
        if (!retryable) options.onResponse?.(response);
        if (retryable) {
          const waited = await this.backoff(
            policy,
            attempt,
            response.headers.get('retry-after'),
            signal,
            isTimeout,
            options.signal,
          );
          if (waited) return fail(waited);
          attempt++;
          continue;
        }
        return fail(httpErrorFromResponse(body, response.status, requestId));
      }

      options.onResponse?.(response);
      const data = extractDataByKey<T>(
        body,
        options.dataKey === undefined ? this.dataKey : options.dataKey,
      );
      if (!options.schema) return ok(data);

      const parsed = options.schema.safeParse(data);
      if (parsed.success) return ok(parsed.data);
      return fail(
        new ResponseValidationError(
          parsed.error.issues.map((issue) => ({
            message: issue.message,
            path: (issue.path ?? []).map(String).join('.'),
          })),
          requestId,
        ),
      );
    }
  }

  /**
   * Resolve per-request headers once, outside the transport's error
   * handling. The server resolvers read Next request APIs, whose rejections
   * (a prerender that ended, a call outside a request scope) belong to the
   * framework and must never be reclassified as a network failure.
   */
  private async resolveHeaders(options: RequestOptions<unknown>): Promise<Headers> {
    const headers = mergeHeaders(this.headers, options.headers);

    const provided = headers.get(REQUEST_ID_HEADER);
    if (!(provided && isValidRequestId(provided))) {
      const incoming = this.requestIdResolver ? await this.requestIdResolver() : undefined;
      headers.set(REQUEST_ID_HEADER, incoming ?? generateRequestId());
    }

    if (this.cookieResolver && !headers.has('cookie')) {
      const cookie = await this.cookieResolver();
      if (cookie) headers.set('cookie', cookie);
    }

    return headers;
  }

  private async attempt(
    url: string,
    method: HttpMethod,
    options: RequestOptions<unknown>,
    signal: AbortSignal | undefined,
    baseHeaders: Headers,
  ): Promise<Attempt> {
    try {
      const headers = new Headers(baseHeaders);

      const prepared =
        method === 'GET' || method === 'HEAD'
          ? { body: undefined, contentType: undefined }
          : prepareBody(options.body);
      if (prepared.contentType && !headers.has('content-type')) {
        headers.set('content-type', prepared.contentType);
      }

      const request: NormalizedRequest = {
        url,
        method,
        headers,
        body: prepared.body,
        signal,
        credentials: options.credentials ?? this.credentials,
        cache: options.cache ?? this.cache,
        next: options.next,
      };

      const response = await this.adapter(request);
      const body = await readResponseBody(response);
      return { kind: 'response', response, body };
    } catch (error) {
      return { kind: 'error', error };
    }
  }

  private classify(error: unknown, timedOut: boolean, callerSignal?: AbortSignal): HttpError {
    if (error instanceof HttpError) return error;
    // A caller abort wins the tie over a timeout that fired in the same tick.
    const preferTimeout = timedOut && !(callerSignal?.aborted ?? false);
    const aborted = abortToHttpError(error, preferTimeout);
    if (aborted) return aborted;
    if (error instanceof Error) return HttpError.network(error.message || 'Network error', error);
    return HttpError.network('Network error', error);
  }

  /** Wait before a retry; returns an error when the wait itself was cut short. */
  private async backoff(
    policy: RetryPolicy,
    attempt: number,
    retryAfter: string | null,
    signal: AbortSignal | undefined,
    isTimeout: () => boolean,
    callerSignal?: AbortSignal,
  ): Promise<HttpError | null> {
    try {
      await sleep(retryDelayMs(policy, attempt, retryAfter), signal);
      return null;
    } catch {
      return isTimeout() && !(callerSignal?.aborted ?? false)
        ? HttpError.timeout()
        : HttpError.cancelled();
    }
  }
}

export const createHttpClient = (options: HttpClientOptions = {}): HttpClient =>
  new HttpClient(options);
