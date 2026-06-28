/**
 * Runtime detection used by the HTTP clients to decide whether to forward
 * cookies explicitly (server) or rely on the browser's credentialed-fetch
 * behaviour (client). Re-exported from the shared single source of truth.
 */

export { isBrowser, isServer } from '../../runtime';
