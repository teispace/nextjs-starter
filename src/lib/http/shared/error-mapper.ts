import { HttpError } from '@/lib/errors';

/**
 * Build an `HttpError` from a failed response. Reads the API's error envelope
 * when the body is one, and falls back to the status line otherwise. The
 * response `X-Request-Id` header is used when the body carried none.
 */
export const httpErrorFromResponse = (
  body: unknown,
  status: number,
  headerRequestId?: string,
): HttpError => {
  const safe = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  return HttpError.fromResponse(
    {
      status: typeof safe.status === 'number' ? safe.status : status,
      message:
        typeof safe.message === 'string' ? safe.message : `Request failed with status ${status}`,
      code: typeof safe.code === 'string' ? safe.code : undefined,
      errors: Array.isArray(safe.errors) ? (safe.errors as Record<string, string>[]) : undefined,
      data:
        typeof safe.data === 'object' && safe.data !== null
          ? (safe.data as Record<string, unknown>)
          : undefined,
      path: typeof safe.path === 'string' ? safe.path : undefined,
      requestId: typeof safe.requestId === 'string' ? safe.requestId : headerRequestId,
    },
    status,
  );
};
