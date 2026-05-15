/**
 * Runtime detection used by the HTTP clients to decide whether to forward
 * cookies explicitly (server) or rely on the browser's credentialed-fetch
 * behaviour (client).
 *
 * Keep this module side-effect-free and trivially small so it tree-shakes
 * cleanly into both the browser bundle and the server bundle.
 */

export const isBrowser = (): boolean => typeof window !== 'undefined';

export const isServer = (): boolean => !isBrowser();
