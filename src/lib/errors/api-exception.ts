import type { ApiErrorResponse } from '@/types';

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
}
