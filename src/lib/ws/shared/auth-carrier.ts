import type { WsAuthProvider } from '../client/types';

/**
 * Build the Socket.IO handshake `auth` payload.
 *
 * Sessions are cookie-based, so by default nothing is sent: the browser
 * attaches the HttpOnly session cookie to the handshake because the socket is
 * opened with `withCredentials`. An app that must send a token instead (a
 * webview, a third-party gateway) passes `auth` to `createWsClient`; it runs
 * on every (re)connect so a rotated token is picked up.
 *
 * Returning `undefined` leaves the handshake's `auth` unset, which is the
 * shape socket.io-client expects rather than an empty object.
 */
export const buildHandshakeAuth = async (options: {
  anonymous: boolean;
  provider?: WsAuthProvider;
}): Promise<Record<string, string> | undefined> => {
  if (options.anonymous || !options.provider) return undefined;
  return options.provider();
};
