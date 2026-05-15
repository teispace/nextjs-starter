import { WsClient } from './ws-client';

/**
 * Default app-wide WebSocket client. Lazily constructed on first access so
 * importing this module from a server-bundled file (e.g. an isomorphic
 * shared util) doesn't instantiate anything until a client component
 * actually uses it. Mirrors the `fetchClient` / `axiosClient` pattern.
 *
 * For multi-namespace apps, use {@link createWsClient} to spin up
 * additional instances.
 */
let _wsClient: WsClient | null = null;

function getWsClient(): WsClient {
  if (!_wsClient) {
    _wsClient = new WsClient();
  }
  return _wsClient;
}

// Use a Proxy so the export name `wsClient` works as a singleton accessor
// without the user having to remember to call a function. Method calls
// transparently route to the lazily-built instance.
export const wsClient = new Proxy({} as WsClient, {
  get(_target, prop, receiver) {
    const client = getWsClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Test hook — reset the singleton between specs. Not part of the public
 * API; only the test setup should use it.
 *
 * @internal
 */
export function __resetWsClientForTests(): void {
  _wsClient = null;
}
