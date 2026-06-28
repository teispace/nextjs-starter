/**
 * Runtime detection shared across the HTTP and WS layers. Side-effect-free and
 * trivially small so it tree-shakes cleanly into both browser and server
 * bundles.
 */

export const isBrowser = (): boolean => typeof window !== 'undefined';

export const isServer = (): boolean => !isBrowser();
