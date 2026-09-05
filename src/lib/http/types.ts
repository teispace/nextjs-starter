import type { HttpError } from '@/lib/errors';

export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Shape accepted by the `params` option. Serialised via `toSearchParams`:
 * `undefined`, `null`, and `''` are skipped so server-side defaults win, and
 * arrays become repeated keys.
 */
export type QueryParams = Record<string, unknown>;

/** Key unwrapped from the success envelope; `null` returns the whole body. */
export type DataKey = string | null;

export type CookieResolver = () => Promise<string | undefined>;
export type RequestIdResolver = () => Promise<string | undefined>;

export interface RetryPolicy {
  /** Retries after the first attempt. `0` disables. */
  retries: number;
  /** Methods safe to replay. */
  methods: readonly HttpMethod[];
  /** Response statuses treated as transient. */
  statuses: readonly number[];
  baseDelayMs: number;
  maxDelayMs: number;
  retryOnNetworkError: boolean;
}

/**
 * Minimal structural contract for a response schema. Zod 4's `safeParse`
 * satisfies it; so does any Standard Schema wrapper with the same shape.
 */
export interface ResponseSchema<T> {
  safeParse(input: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: readonly { message: string; path?: readonly PropertyKey[] }[] };
      };
}

export interface AuthPolicy {
  /**
   * Attempt to renew the session after a 401. Resolve `true` when the
   * original request should be replayed once. Browser-only: the server never
   * refreshes (a render cannot write cookies back, and process-wide state would
   * be shared across users).
   */
  refresh?: () => Promise<boolean>;
  /** Called when a 401 could not be recovered. Typically a redirect to sign-in. */
  onUnauthorized?: (error: HttpError) => void;
}

export interface RequestOptions<T = unknown> {
  method?: HttpMethod;
  params?: QueryParams;
  headers?: HeadersInit;
  /** Plain data is JSON-encoded; `FormData`, `Blob`, strings, and streams pass through. */
  body?: unknown;
  /** Composed with the timeout via `AbortSignal.any`; whichever fires first wins. */
  signal?: AbortSignal;
  /** Per-request timeout in ms. `0` disables it (long-poll, SSE, large uploads). */
  timeout?: number;
  cache?: RequestCache;
  /** Next.js fetch extensions (`revalidate`, `tags`) for Server Components. */
  next?: RequestInit['next'];
  credentials?: RequestCredentials;
  /** Override the client's envelope key for this call. */
  dataKey?: DataKey;
  /** Validate the unwrapped body; a mismatch is a failed request. */
  schema?: ResponseSchema<T>;
  /** Override or disable the client's retry policy for this call. */
  retry?: Partial<RetryPolicy> | false;
  /** Do not attempt a session refresh on 401 (sign-in, refresh, public endpoints). */
  skipAuth?: boolean;
  /**
   * Observe the final response (after retries and refresh) before it is
   * turned into a result. The body is already consumed; use it for headers,
   * e.g. relaying `Set-Cookie` from a Server Action.
   */
  onResponse?: (response: Response) => void;
}

/** What an adapter receives: everything already resolved to primitives. */
export interface NormalizedRequest {
  url: string;
  method: HttpMethod;
  headers: Headers;
  body: BodyInit | undefined;
  signal: AbortSignal | undefined;
  credentials: RequestCredentials;
  cache: RequestCache | undefined;
  next: RequestInit['next'];
}

/**
 * A transport. Must resolve with a standard `Response` for any HTTP status
 * (never throw on 4xx/5xx) and throw only for transport failures, aborts,
 * and timeouts. Both built-in adapters follow this contract, so one test
 * suite covers both.
 */
export type Adapter = (request: NormalizedRequest) => Promise<Response>;

export interface HttpClientOptions {
  /** Defaults to `getApiBaseUrl()`. Relative URLs are resolved against it. */
  baseURL?: string;
  adapter?: Adapter;
  /** Default timeout in ms; `0` disables. Defaults to `DEFAULT_TIMEOUT_MS`. */
  timeout?: number;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  retry?: Partial<RetryPolicy> | false;
  dataKey?: DataKey;
  /** Server-only: inject a `Cookie` header on every request. */
  cookieResolver?: CookieResolver;
  /** Server-only: propagate the incoming request id instead of minting one. */
  requestIdResolver?: RequestIdResolver;
  auth?: AuthPolicy;
}
