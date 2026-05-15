// Universal foundation — safe to import from any runtime (browser, SSR,
// edge, Node). For SSR cookie-forwarding helpers see `./server/`, which
// is fenced behind `'server-only'` and reachable only via dynamic import
// from within the HTTP interceptors.
export {
  extractRequestIdFromHeaderRecord,
  extractRequestIdFromHeaders,
  generateRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
} from './request-id';
export { parseApiError } from './response-parser';
export { isBrowser, isServer } from './runtime';
export { toSearchParams } from './search-params';
