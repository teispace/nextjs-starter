import type { Instrumentation } from 'next';

/**
 * Server observability hooks. `register` runs once per server instance; wire
 * OpenTelemetry or an error tracker here. `onRequestError` receives every
 * uncaught server error (render, route handler, action, proxy) with its
 * digest, which is the value shown to users by the error boundaries.
 *
 * Both are Node-only: the imports stay dynamic so the edge bundle, if any,
 * never pulls in pino.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger } = await import('@/lib/logger');
  logger.info({ runtime: process.env.NEXT_RUNTIME }, 'Server instance ready');
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportRequestError } = await import('@/lib/logger/request-error');
  reportRequestError(error, request, context);
};
