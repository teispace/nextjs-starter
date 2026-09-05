import type { ApiErrorResponse } from '@/types';

import { AppError } from './app-error';

/**
 * Status used for failures that never reached an HTTP response (network
 * error, abort, timeout). The server never sends `0`, so it is an unambiguous
 * "failed before or without a real HTTP status" marker.
 */
export const CLIENT_FAILURE_STATUS = 0;

/** Codes the HTTP layer mints itself; server-supplied codes pass through untouched. */
export const HTTP_ERROR_CODE = {
  /** Request was cancelled via an `AbortSignal` (caller abort or unmount). */
  CANCELLED: 'ERR_CANCELLED',
  /** Request exceeded its timeout budget before a response arrived. */
  TIMEOUT: 'ERR_TIMEOUT',
  /** Transport failed with no HTTP response (DNS, connection refused, offline). */
  NETWORK: 'ERR_NETWORK',
  /** The response body did not match the schema the caller supplied. */
  RESPONSE_INVALID: 'ERR_RESPONSE_INVALID',
  /** Fallback when the server sent no machine-readable code. */
  HTTP: 'ERR_HTTP',
} as const;

export type HttpErrorCode = (typeof HTTP_ERROR_CODE)[keyof typeof HTTP_ERROR_CODE];

export type FieldErrors = Record<string, string>;

export interface HttpErrorInit {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string>[];
  data?: Record<string, unknown>;
  path?: string;
  requestId?: string;
  cause?: unknown;
}

/**
 * Serialisable shape of an `HttpError`. Class instances cannot cross the
 * Server Component or Server Action boundary; send this instead and rebuild
 * with `HttpError.fromPlain` where a class is wanted again.
 */
export interface PlainHttpError {
  readonly kind: 'HttpError';
  readonly status: number;
  readonly message: string;
  readonly code: string;
  readonly errors?: Record<string, string>[];
  readonly data?: Record<string, unknown>;
  readonly path?: string;
  readonly requestId?: string;
}

export class HttpError extends AppError {
  readonly status: number;
  readonly errors?: Record<string, string>[];
  readonly data?: Record<string, unknown>;
  readonly path?: string;
  readonly requestId?: string;

  constructor(init: HttpErrorInit) {
    super(init.message, { code: init.code ?? HTTP_ERROR_CODE.HTTP, cause: init.cause });
    this.status = init.status;
    this.errors = init.errors;
    this.data = init.data;
    this.path = init.path;
    this.requestId = init.requestId;
  }

  /** Build from the API's error envelope (see `ApiErrorResponse`). */
  static fromResponse(body: Partial<ApiErrorResponse>, fallbackStatus: number): HttpError {
    return new HttpError({
      status: typeof body.status === 'number' ? body.status : fallbackStatus,
      message: body.message || `Request failed with status ${fallbackStatus}`,
      code: body.code,
      errors: body.errors,
      data: body.data,
      path: body.path,
      requestId: body.requestId,
    });
  }

  static cancelled(message = 'Request was cancelled', cause?: unknown): HttpError {
    return new HttpError({
      status: CLIENT_FAILURE_STATUS,
      code: HTTP_ERROR_CODE.CANCELLED,
      message,
      cause,
    });
  }

  static timeout(message = 'Request timed out', cause?: unknown): HttpError {
    return new HttpError({
      status: CLIENT_FAILURE_STATUS,
      code: HTTP_ERROR_CODE.TIMEOUT,
      message,
      cause,
    });
  }

  static network(message = 'Network error', cause?: unknown): HttpError {
    return new HttpError({
      status: CLIENT_FAILURE_STATUS,
      code: HTTP_ERROR_CODE.NETWORK,
      message,
      cause,
    });
  }

  /** Coerce any thrown value into an `HttpError` without losing information. */
  static from(error: unknown): HttpError {
    if (error instanceof HttpError) return error;
    if (error instanceof Error) {
      return new HttpError({ status: 500, message: error.message, cause: error });
    }
    return new HttpError({ status: 500, message: 'An unknown error occurred', cause: error });
  }

  static fromPlain(plain: PlainHttpError): HttpError {
    return new HttpError({
      status: plain.status,
      message: plain.message,
      code: plain.code,
      errors: plain.errors,
      data: plain.data,
      path: plain.path,
      requestId: plain.requestId,
    });
  }

  toPlain(): PlainHttpError {
    return {
      kind: 'HttpError',
      status: this.status,
      message: this.message,
      code: this.code,
      ...(this.errors && { errors: this.errors }),
      ...(this.data && { data: this.data }),
      ...(this.path && { path: this.path }),
      ...(this.requestId && { requestId: this.requestId }),
    };
  }

  toJSON(): PlainHttpError {
    return this.toPlain();
  }

  // ── Field-level validation helpers ────────────────────────────────────────

  hasFieldError(key: string): boolean {
    return this.errors?.some((err) => key in err) ?? false;
  }

  fieldError(key: string): string | undefined {
    const err = this.errors?.find((entry) => key in entry);
    return err ? String(err[key]) : undefined;
  }

  fieldErrorOrMessage(key: string): string {
    return this.fieldError(key) ?? this.message;
  }

  fieldErrors(): FieldErrors {
    const result: FieldErrors = {};
    for (const err of this.errors ?? []) {
      const entry = Object.entries(err)[0];
      if (entry) result[entry[0]] = String(entry[1]);
    }
    return result;
  }

  // ── Classification ────────────────────────────────────────────────────────

  isCancelled(): boolean {
    return this.code === HTTP_ERROR_CODE.CANCELLED;
  }

  isTimeout(): boolean {
    return this.code === HTTP_ERROR_CODE.TIMEOUT;
  }

  isNetworkError(): boolean {
    return this.code === HTTP_ERROR_CODE.NETWORK;
  }

  /** Cancellation, timeout, or transport failure: nothing came back from the server. */
  isClientFailure(): boolean {
    return this.status === CLIENT_FAILURE_STATUS;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

export const isPlainHttpError = (value: unknown): value is PlainHttpError =>
  typeof value === 'object' && value !== null && (value as PlainHttpError).kind === 'HttpError';
