import 'server-only';

import { cache } from 'react';

import { readIncomingRequestId } from '@/lib/http/server';

import { logger } from './index';

/**
 * A logger bound to the current request id, one per render. Reading the id
 * touches request headers, so the caller becomes dynamic; use the plain
 * `logger` from cached or static code.
 */
export const getRequestLogger = cache(async () => {
  const requestId = await readIncomingRequestId();
  return requestId ? logger.child({ requestId }) : logger;
});
