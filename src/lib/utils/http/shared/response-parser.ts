import { ApiException } from '@/lib/errors';

/**
 * Build an `ApiException` from a server error response body.
 *
 * Both HTTP clients used to inline this parsing — every change to the error
 * envelope (e.g. adding `requestId`) had to be made twice and inevitably
 * drifted. This is the single source of truth.
 *
 * `responseRequestId` is the value read from the `X-Request-Id` response
 * header. It's used as a fallback when the error body didn't carry one
 * (e.g. when the server rejected the request before stamping the envelope).
 */
export function parseApiError(
  body: unknown,
  fallbackStatus: number,
  responseRequestId?: string,
  stack?: string,
): ApiException {
  const safeBody = (typeof body === 'object' && body !== null ? body : {}) as Record<
    string,
    unknown
  >;

  const exception = ApiException.fromResponse(
    {
      status: typeof safeBody.status === 'number' ? safeBody.status : fallbackStatus,
      message:
        typeof safeBody.message === 'string'
          ? safeBody.message
          : `Request failed with status ${fallbackStatus}`,
      code: typeof safeBody.code === 'string' ? safeBody.code : undefined,
      errors: Array.isArray(safeBody.errors)
        ? (safeBody.errors as Record<string, string>[])
        : undefined,
      data:
        typeof safeBody.data === 'object' && safeBody.data !== null
          ? (safeBody.data as Record<string, unknown>)
          : undefined,
      path: typeof safeBody.path === 'string' ? safeBody.path : undefined,
      requestId: typeof safeBody.requestId === 'string' ? safeBody.requestId : responseRequestId,
    },
    fallbackStatus,
  );

  if (stack) exception.stack = stack;
  return exception;
}
