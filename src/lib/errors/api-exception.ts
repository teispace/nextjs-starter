import type { ApiErrorResponse } from '@/types';

/**
 * Status used for client-side failures that never reached an HTTP response
 * (network error, abort, timeout). The server never sends `0`, so it's an
 * unambiguous "this failed before/without a real HTTP status" marker.
 */
export const CLIENT_FAILURE_STATUS = 0;

/**
 * Machine-readable `code` values stamped on client-originated failures so
 * callers can branch without string-matching `message`. Server-supplied
 * codes (e.g. `VALIDATION_ERROR`) flow through `code` untouched; these are
 * the codes the HTTP clients mint themselves.
 */
export const CLIENT_ERROR_CODE = {
  /** Request was cancelled via an `AbortSignal` (caller abort or unmount). */
  CANCELLED: 'ERR_CANCELLED',
  /** Request exceeded its timeout budget before a response arrived. */
  TIMEOUT: 'ERR_TIMEOUT',
  /** Transport failed with no HTTP response (DNS, connection refused, offline). */
  NETWORK: 'ERR_NETWORK',
} as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODE)[keyof typeof CLIENT_ERROR_CODE];

type ApiExceptionOptions = {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string>[];
  data?: Record<string, unknown>;
  path?: string;
  requestId?: string;
  stack?: string;
};

export class ApiException extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string>[];
  data?: Record<string, unknown>;
  path?: string;
  requestId?: string;

  constructor({
    status,
    message,
    code,
    errors,
    data,
    path,
    requestId,
    stack,
  }: ApiExceptionOptions) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.data = data;
    this.path = path;
    this.requestId = requestId;

    if (stack) {
      this.stack = stack;
    }

    Object.setPrototypeOf(this, ApiException.prototype);
  }

  /** Build from an API error response envelope (see `ApiErrorResponse`). */
  static fromResponse(body: Partial<ApiErrorResponse>, fallbackStatus = 500): ApiException {
    return new ApiException({
      status: body.status ?? fallbackStatus,
      message: body.message || 'An unknown error occurred',
      code: body.code,
      errors: body.errors,
      data: body.data,
      path: body.path,
      requestId: body.requestId,
    });
  }

  /** A cancelled-request exception (caller aborted via `AbortSignal`). */
  static cancelled(message = 'Request was cancelled', stack?: string): ApiException {
    return new ApiException({
      status: CLIENT_FAILURE_STATUS,
      code: CLIENT_ERROR_CODE.CANCELLED,
      message,
      stack,
    });
  }

  /** A timed-out-request exception (no response within the timeout budget). */
  static timeout(message = 'Request timed out', stack?: string): ApiException {
    return new ApiException({
      status: CLIENT_FAILURE_STATUS,
      code: CLIENT_ERROR_CODE.TIMEOUT,
      message,
      stack,
    });
  }

  /** A network-failure exception (transport error, no HTTP response). */
  static network(message = 'Network error', stack?: string): ApiException {
    return new ApiException({
      status: CLIENT_FAILURE_STATUS,
      code: CLIENT_ERROR_CODE.NETWORK,
      message,
      stack,
    });
  }

  static convertAny(error: unknown): ApiException {
    if (error instanceof ApiException) return error;

    if (error instanceof Error) {
      return new ApiException({
        status: 500,
        message: error.message,
        stack: error.stack,
      });
    }

    return new ApiException({
      status: 500,
      message: 'An unknown error occurred',
    });
  }

  containsKey(key: string): boolean {
    if (!this.errors) return false;
    return this.errors.some((err) => key in err);
  }

  getErrorMessage(key: string): string | undefined {
    if (!this.errors) return undefined;
    const err = this.errors.find((err) => key in err);
    return err ? String(err[key]) : undefined;
  }

  getErrorMessageIfExists(key: string): string {
    return this.getErrorMessage(key) || this.message;
  }

  getFieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    if (!this.errors) return result;

    for (const err of this.errors) {
      const [key, value] = Object.entries(err)[0];
      result[key] = String(value);
    }

    return result;
  }

  /** True when the request was cancelled by the caller (abort signal). */
  isCancelled(): boolean {
    return this.code === CLIENT_ERROR_CODE.CANCELLED;
  }

  /** True when the request exceeded its timeout budget. */
  isTimeout(): boolean {
    return this.code === CLIENT_ERROR_CODE.TIMEOUT;
  }

  /** True when the transport failed without an HTTP response. */
  isNetworkError(): boolean {
    return this.code === CLIENT_ERROR_CODE.NETWORK;
  }

  /**
   * True for any failure that never produced an HTTP response — cancellation,
   * timeout, or a raw network/transport error. Handy for "should I show a
   * retry button vs a validation message?" branching.
   */
  isClientFailure(): boolean {
    return this.status === CLIENT_FAILURE_STATUS;
  }
}
