/**
 * Runtime guard for the WS layer.
 *
 * Unlike the HTTP layer, which silently no-ops on the server (no socket to
 * open), the WS layer **throws** when invoked in a non-browser runtime.
 * Opening a WebSocket from a Server Component, Server Action, or Route
 * Handler is always a bug — surfacing it immediately is far kinder to the
 * developer than letting the error reach production as "the socket
 * mysteriously never connects."
 *
 * Use `ensureBrowser(method)` at every public client-side entry point.
 */
import { isBrowser, isServer } from '../../runtime';
import { WS_LOCAL_ERROR_CODES } from '../constants';

export { isBrowser, isServer };

export class WsSsrError extends Error {
  readonly code = WS_LOCAL_ERROR_CODES.SSR_BLOCKED;

  constructor(method: string) {
    super(
      `[ws] ${method}() was called in a server context. ` +
        `WebSocket clients run in the browser only. ` +
        `Move the call into a "use client" component, or guard it with typeof window !== 'undefined'.`,
    );
    this.name = 'WsSsrError';
    Object.setPrototypeOf(this, WsSsrError.prototype);
  }
}

export function ensureBrowser(method: string): void {
  if (isServer()) throw new WsSsrError(method);
}
