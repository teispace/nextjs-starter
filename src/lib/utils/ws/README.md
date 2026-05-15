# WebSocket Client

**TL;DR** — Typed Socket.IO client wrapping `socket.io-client` against the NestJS-starter backend. Cookie-mode auth by default, public/anonymous mode opt-in. Heartbeat, reconnection, and `auth:force:disconnect` handling are built in. Connection state flows through Redux; subscriptions through three small hooks. **Browser-only** — opening a socket from a Server Component throws.

```
src/lib/utils/ws/
├─ types/           backend-mirrored event maps + payload shapes
├─ shared/          runtime guard, auth-carrier, URL composer (internal)
├─ client/          WsClient class + default `wsClient` singleton (lazy)
├─ redux/           bridge + selectors (internal: only StoreProvider attaches)
├─ hooks/           useWsStatus, useWsEvent, useWsEmit
├─ constants.ts     namespace, heartbeat interval, reconnection bounds
└─ index.ts         public barrel
```

Feature code imports from `@/lib/utils/ws` only. `shared/`, `redux/bridge`, and `client/internals` are private — reaching into them breaks at the next refactor.

---

## Table of Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Hooks](#hooks)
- [Lifecycle & reconnection](#lifecycle--reconnection)
- [Force-disconnect (server-initiated)](#force-disconnect-server-initiated)
- [Heartbeat](#heartbeat)
- [Token renewal](#token-renewal)
- [Presence](#presence)
- [Public / anonymous connections](#public--anonymous-connections)
- [SSR boundary](#ssr-boundary)
- [Adding custom events](#adding-custom-events)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

---

## Quick start

```tsx
'use client';

import { useWsEvent, useWsEmit, useWsStatus } from '@/lib/utils/ws';

export function PresenceWidget({ userId }: { userId: string }) {
  const { isConnected } = useWsStatus();
  const emit = useWsEmit();

  useEffect(() => {
    if (isConnected) emit('presence:subscribe', { userId });
    return () => { emit('presence:unsubscribe', { userId }); };
  }, [isConnected, userId, emit]);

  useWsEvent('presence:online', ({ userId: uid }) => {
    if (uid === userId) console.log(`${userId} is online`);
  });

  return <span>{isConnected ? '🟢' : '⚪'}</span>;
}
```

No explicit `connect()` — `useWsEvent` triggers a lazy connect on first subscribe. The transport opens once and stays alive for the app lifetime.

---

## Configuration

### Environment

Reuses `NEXT_PUBLIC_API_URL` from the HTTP layer — **bare origin** (no `/api/v{n}` suffix). The WS client strips any accidental version path and appends the namespace:

```
NEXT_PUBLIC_API_URL=https://api.example.com   →  wss://api.example.com/ws
NEXT_PUBLIC_API_URL=                          →  /ws   (same-origin)
```

No new env var. If you change the WS namespace server-side, override via `createWsClient({ namespace: '/chat' })` or the `WS_NAMESPACE` constant.

### Constants

| Constant | Default | Meaning |
|---|---|---|
| `WS_NAMESPACE` | `/ws` | Backend namespace mounted by `WsGateway` |
| `WS_HEARTBEAT_INTERVAL_MS` | `25_000` | Application-level `ping` cadence. Must be < backend `WS_SOCKET_TTL_SECONDS` (default 120 s) |
| `WS_TOKEN_RENEWAL_LEAD_MS` | `60_000` | Lead time before access-token expiry (bearer mode only) |
| `WS_RECONNECTION_DELAY_MIN_MS` | `1_000` | Socket.IO reconnection base delay |
| `WS_RECONNECTION_DELAY_MAX_MS` | `10_000` | Socket.IO reconnection cap (exponential backoff) |
| `SAVE_AUTH_TOKENS` | `false` | Cookie-mode (default) vs bearer-mode (re-uses the HTTP layer's flag) |

All defaults match the backend's documented defaults (`nestjs-starter/docs/socket.md` §3, §15) — tune only if you've changed the matching backend env vars.

---

## Architecture

```
                  ┌───────────────────────────────────┐
                  │  React component                  │
                  │   useWsStatus / useWsEvent /      │
                  │   useWsEmit                       │
                  └────────┬──────────────────┬───────┘
              reads state  │                  │  emits / subscribes
                           ▼                  ▼
                  ┌──────────────┐   ┌──────────────────┐
                  │  ws Redux    │   │  wsClient        │
                  │  slice       │◀──┤  (singleton)     │
                  │              │   │                  │
                  │  status      │   │  socket.io-client│
                  │  socketId    │   │  + heartbeat     │
                  │  lastError   │   │  + force-disc    │
                  └──────────────┘   └────────┬─────────┘
                          ▲                   │
                          │                   │ WSS / transports:['websocket']
                          │  bridge           ▼
                          │             ┌─────────────────┐
                          └─────────────┤  Backend /ws    │
                            dispatches   │  (NestJS)      │
                                         └─────────────────┘
```

- **`wsClient`** owns one underlying socket. Lifecycle (connect, reconnect, heartbeat, force-disconnect, token renewal) lives here.
- **The bridge** subscribes to `wsClient`'s lifecycle emitter and dispatches into the ws slice. It is the **only** code path that touches the slice — never dispatch into it from feature code.
- **Hooks** read state from the slice (`useWsStatus`) or talk to the socket (`useWsEvent`, `useWsEmit`).
- **Connection is lazy.** `wsClient.connect()` is called automatically by the first `useWsEvent` subscriber. No subscribers, no socket — the transport doesn't open at module load.

---

## Authentication

### Cookie-mode (default)

`SAVE_AUTH_TOKENS = false`. The browser cookie jar carries the `access` HttpOnly cookie on the Socket.IO handshake automatically — the backend's three-source extractor reads it from `handshake.headers.cookie`. **No auth payload is sent.** Tokens never touch JavaScript.

### Bearer-mode

`SAVE_AUTH_TOKENS = true`. The client reads the access token from `secureStorageTokenStore` and sends it as `handshake.auth.token`. The backend extracts it first (priority 1 over cookie). If no token is stored, `connect()` rejects with `WS_AUTH_REQUIRED` before opening the socket.

Both modes work transparently against the same backend — the only difference is where the token rides.

---

## Hooks

### `useWsStatus()`

Read-only window onto the connection. Each field is a separate selector so components only re-render when their own datum changes.

```ts
const {
  status,                  // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  isConnected,             // boolean
  isDisconnectedFatally,   // true when server sent reconnectable=false
  socketId,                // current socket id, or null
  lastError,               // last WsErrorPayload, or null
  forceDisconnectReason,   // WsDisconnectReason | null
  reconnectable,           // boolean | null
} = useWsStatus();
```

### `useWsEvent(event, handler)`

Subscribe to a server-emitted event. The handler is captured by ref, so passing an inline arrow doesn't cause re-subscriptions on every render. Only `event` is a real dependency.

```tsx
useWsEvent('presence:online', ({ userId, timestamp }) => {
  // typed automatically from ServerToClientEvents
});
```

**Triggers a lazy connect** on first subscriber. Subsequent subscriptions reuse the open socket.

### `useWsEmit()`

Returns a stable, fully-typed emit function. Returns `false` if the socket isn't connected yet.

```tsx
const emit = useWsEmit();
emit('presence:subscribe', { userId });   // type-checked against ClientToServerEvents
```

---

## Lifecycle & reconnection

| Status | Meaning |
|---|---|
| `idle` | No connection attempt yet. |
| `connecting` | Initial connect in flight. |
| `connected` | Socket open, handshake accepted, ready to send/receive. |
| `reconnecting` | Transport closed unexpectedly; socket.io-client is retrying (exponential backoff capped at 10 s). |
| `disconnected` | Explicitly disconnected, or the server force-disconnected with `reconnectable: false`. |

Socket.IO drives reconnection automatically for network failures (`transport close`, `ping timeout`). The client respects the server's `reconnectable` flag — when the backend sends `auth:force:disconnect` with `reconnectable: false`, auto-reconnect is **disabled** until you call `connect()` explicitly. This prevents login-loop storms after session revocation.

---

## Force-disconnect (server-initiated)

The backend emits `auth:force:disconnect` with `{ reason, reconnectable }`. **Branch on `reconnectable`, not `reason`.**

| `reason` | `reconnectable` | UI guidance |
|---|---|---|
| `session_revoked` | `false` | Show "signed out elsewhere"; route to login |
| `max_connections` | `false` | Show "device limit reached"; suggest closing other tabs |
| `rate_limited` | `false` | Show "too many connection attempts"; back off ~60 s |
| `roles_changed` | `true` | Reconnect happens transparently — new handshake pulls fresh permissions |
| `max_age` | `true` | Reconnect happens transparently |
| `server_shutdown` | `true` | Reconnect happens transparently — lands on a healthy node |

The Redux slice exposes both `forceDisconnectReason` and `reconnectable`; the helper `selectWsIsDisconnectedFatally` checks `reconnectable === false`.

```tsx
const { isDisconnectedFatally, forceDisconnectReason } = useWsStatus();

useEffect(() => {
  if (isDisconnectedFatally && forceDisconnectReason === 'session_revoked') {
    router.push('/login');
  }
}, [isDisconnectedFatally, forceDisconnectReason]);
```

---

## Heartbeat

The client sends `ping` every 25 s to refresh the backend's Redis socket-metadata TTL (default 120 s server-side) and trigger a roles-version check. This is **separate** from socket.io's engine.io ping — both run. Heartbeat starts on `connect` and stops on `disconnect`; you don't manage it.

If you change `WS_HEARTBEAT_INTERVAL_MS`, also change the backend's `WS_SOCKET_TTL_SECONDS` to stay > interval × 4.

---

## Token renewal

**Cookie-mode (default): not implemented in v1.** When the access token nears expiry, the socket disconnects and reconnects — the browser cookie jar supplies a fresh access cookie on the new handshake (refreshed by the HTTP layer on the next API call). One sub-second blip near token expiry.

**Bearer-mode:** Future work. The backend supports in-place `auth:token:renew` (rate-limited to 5/min) but the v1 client doesn't schedule it. Subscribe to `auth:token:renewed` if you implement renewal yourself, and call `wsClient.emit('auth:token:renew', { refreshToken })` ahead of expiry.

---

## Presence

Backend tracks online/offline state in Redis. To watch a specific user:

```tsx
const emit = useWsEmit();

useEffect(() => {
  emit('presence:subscribe', { userId });
  return () => { emit('presence:unsubscribe', { userId }); };
}, [userId, emit]);

useWsEvent('presence:status', ({ userId: uid, status, lastSeen }) => {
  /* initial snapshot for `uid` */
});

useWsEvent('presence:online',  ({ userId: uid }) => { /* uid came online */ });
useWsEvent('presence:offline', ({ userId: uid }) => { /* uid went offline */ });
```

Cap: 50 subscriptions per socket (backend-enforced).

---

## Public / anonymous connections

The backend supports unauthenticated sockets — they only reach `@WsPublic()` handlers (currently `ping`, `presence:subscribe`, `presence:unsubscribe`). To opt in:

```ts
await wsClient.connect({ anonymous: true });
```

The handshake is sent without an auth payload and without a cookie. The backend admits the connection up to a global cap (`WS_MAX_ANONYMOUS_SOCKETS`, default 10,000).

Default is `anonymous: false` — connect refuses in bearer-mode without a token; cookie-mode optimistically connects and the server rejects if the cookie is missing.

---

## SSR boundary

Opening a WebSocket from a Server Component is **always** a bug — there's no client to listen on the other end. The WS layer throws `WsSsrError` instead of silently no-op'ing:

```
[ws] connect() was called in a server context.
WebSocket clients run in the browser only.
Move the call into a "use client" component, or guard it with typeof window !== 'undefined'.
```

In practice you won't hit this — the hooks are marked `'use client'` and only run in effects (which fire after hydration). The error catches misuse from non-React code paths (utility imports, etc.).

---

## Adding custom events

The backend's `ClientToServerEvents` / `ServerToClientEvents` interfaces are the contract. To extend on the frontend, use TypeScript declaration merging — keep the merge near the feature that introduces the event:

```ts
// src/features/chat/types/ws-events.ts
import '@/lib/utils/ws'; // ensures the base interface is loaded

declare module '@/lib/utils/ws' {
  interface ClientToServerEvents {
    'message:send': (payload: { roomId: string; content: string }) => void;
  }
  interface ServerToClientEvents {
    'message:new': (payload: {
      id: string;
      roomId: string;
      authorId: string;
      content: string;
      createdAt: string;
    }) => void;
  }
}
```

Then in feature code:

```tsx
useWsEvent('message:new', (msg) => {       // fully typed
  appendToTimeline(msg);
});

const emit = useWsEmit();
emit('message:send', { roomId, content }); // fully typed
```

**Coordinate with the backend** — events not declared in the backend's gateway are silently dropped on the server. Add the handler on the gateway side first.

---

## API reference

### `wsClient` (default singleton)

| Method | Returns | Notes |
|---|---|---|
| `connect(opts?)` | `Promise<void>` | Opens the socket. `{ anonymous: true }` to skip auth. Idempotent. |
| `disconnect(opts?)` | `void` | Closes the socket. `{ permanent: true }` removes all listeners. |
| `getStatus()` | `WsStatus` | Current connection status (matches the slice). |
| `getSocketId()` | `string \| null` | Current socket id or null when disconnected. |
| `isConnected()` | `boolean` | Convenience for `status === 'connected'`. |
| `on(event, h)` | `() => void` | Subscribe to a lifecycle event (used by the bridge — rarely needed in feature code). |
| `onEvent(event, h)` | `() => void` | Subscribe to a server→client event (used by hooks). |
| `emit(event, ...)` | `boolean` | Emit a client→server event. Returns false when disconnected. |

### `createWsClient(opts?)`

Build an additional client for a different namespace, custom URL, or custom `socket.io-client` options. Used for multi-namespace apps (`/chat`, `/notifications`). Each instance is independent.

```ts
import { createWsClient } from '@/lib/utils/ws';

export const chatWsClient = createWsClient({ namespace: '/chat' });
```

### Hooks

| Hook | Purpose |
|---|---|
| `useWsStatus()` | Read connection state from Redux. |
| `useWsEvent(event, handler)` | Subscribe to a server event. Lazy connect on first call. |
| `useWsEmit()` | Stable, typed emit function. |

### Selectors (advanced)

Exported from `@/lib/utils/ws`. Use them with `useAppSelector` when `useWsStatus` is too coarse:

`selectWsStatus`, `selectWsSocketId`, `selectWsLastError`, `selectWsForceDisconnectReason`, `selectWsReconnectable`, `selectWsConnectedAt`, `selectWsAnonymous`, `selectWsIsConnected`, `selectWsIsDisconnectedFatally`.

### Types

All exported from `@/lib/utils/ws`:

- **Events:** `ClientToServerEvents`, `ServerToClientEvents`, `ClientEventName`, `ServerEventName`
- **Payloads:** `WsErrorPayload`, `WsForceDisconnectPayload`, `WsPongPayload`, `WsPresencePayload`, `WsPresenceStatusPayload`, `WsTokenRenewedPayload`
- **Disconnect:** `WS_DISCONNECT_REASON` (const), `WsDisconnectReason` (union), `isReconnectableReason()`
- **Transport:** `WsStatus`, `WsClientOptions`, `WsConnectOptions`

---

## Troubleshooting

### `WsSsrError: connect() was called in a server context`

You imported `wsClient` or one of its hooks into a Server Component. The hooks ship with `'use client'` so this almost always means an imperative call (`wsClient.connect()`) is happening at module top-level. Wrap it in `useEffect` or move it into a client component.

### "Status stays `idle` forever"

No subscriber has triggered the lazy connect. Either render a component that calls `useWsEvent` / `useWsEmit`, or call `wsClient.connect()` explicitly from an effect.

### "Connected but events don't arrive"

The event name in `useWsEvent` doesn't match the backend's gateway. Check:
1. The backend handler is registered with `@SubscribeMessage('foo:bar')`.
2. The frontend declares the same name in `ServerToClientEvents`.
3. CORS allows your origin — Socket.IO uses the same CORS gate as HTTP.

### "Server keeps disconnecting me with `max_age`"

Backend's `WS_MAX_CONNECTION_AGE_MS` (default 24 h). The client auto-reconnects on this reason — if you're seeing rapid cycles, check that `reconnectable: true` is being honoured (your custom force-disconnect handler may be tearing things down).

### Sessions revoked when I refresh the page

Cookie-mode relies on the browser carrying the access cookie. If your dev setup has frontend on a different origin from the backend (e.g. `localhost:3000` vs `localhost:8080`), check the backend's `COOKIE_SAMESITE` and `COOKIE_DOMAIN`.

### Tests fail with "Cannot set properties of null (setting 'textBaseline')"

`react-secure-storage` constructs its encryption service at import time and calls `<canvas>.getContext`, which jsdom doesn't implement. Already handled — `test/setup.ts` stubs `react-secure-storage` globally. If you hit this in a fresh test file, make sure your test config uses `test/setup.ts` as `setupFiles`.

---

## Related docs

- Backend WS contract → `nestjs-starter/docs/socket.md`
- Event interfaces (source of truth) → `nestjs-starter/src/infrastructure/websocket/types/ws-events.interface.ts`
- Disconnect reasons + reconnectable policy → `nestjs-starter/src/infrastructure/websocket/websocket.constants.ts`
- HTTP layer (sibling) → `src/lib/utils/http/README.md`
