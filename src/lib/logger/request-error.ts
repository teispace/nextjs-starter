import type { Instrumentation } from 'next';

import { REQUEST_ID_HEADER } from '@/lib/http/shared/request-id';

import { logger } from './index';

type RequestInfo = Parameters<Instrumentation.onRequestError>[1];
type RequestContext = Parameters<Instrumentation.onRequestError>[2];

const headerValue = (headers: RequestInfo['headers'], name: string): string | undefined => {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * One structured line per uncaught server error. Request headers are not
 * logged wholesale: they carry cookies. Only the request id is lifted out
 * so the line joins the API's logs for the same request.
 */
export const reportRequestError = (
  error: unknown,
  request: RequestInfo,
  context: RequestContext,
): void => {
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? String((error as { digest: unknown }).digest)
      : undefined;
  logger.error(
    {
      err: error,
      digest,
      requestId: headerValue(request.headers, REQUEST_ID_HEADER),
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
    'Unhandled server error',
  );
};
