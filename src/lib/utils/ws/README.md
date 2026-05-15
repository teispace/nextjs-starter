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
- [In-depth usage guide](#in-depth-usage-guide)
  - [Authentication modes](#authentication-modes)
  - [Connection lifecycle in practice](#connection-lifecycle-in-practice)
  - [Listening to server events](#listening-to-server-events)
  - [Sending events to the server](#sending-events-to-the-server)
  - [Reading and reacting to connection state](#reading-and-reacting-to-connection-state)
  - [Presence (online/offline tracking)](#presence-onlineoffline-tracking)
  - [Handling server-initiated disconnects](#handling-server-initiated-disconnects)
  - [Public / anonymous flows](#public--anonymous-flows)
  - [Multi-namespace apps](#multi-namespace-apps)
  - [Adding custom feature events](#adding-custom-feature-events)
  - [Imperative use outside React](#imperative-use-outside-react)
  - [Cleanup on logout](#cleanup-on-logout)
  - [Testing components that use the WS layer](#testing-components-that-use-the-ws-layer)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

---

## Quick start

```tsx
'use client';

import { useEffect } from 'react';
import { useWsEvent, useWsEmit, useWsStatus } from '@/lib/utils/ws';

export function PresenceWidget({ userId }: { userId: string }) {
  const { isConnected } = useWsStatus();
  const emit = useWsEmit();

  useEffect(() => {
    if (!isConnected) return;
    emit('presence:subscribe', { userId });
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

## In-depth usage guide

This section walks through every realistic scenario you'll hit. Read top-to-bottom on your first integration, or jump to a specific subsection later.

### Authentication modes

The WS layer reuses the HTTP layer's `SAVE_AUTH_TOKENS` flag (in `src/lib/config/constants.ts`). Pick one mode for the whole app — mixing per-request makes the auth surface much harder to reason about.

#### Cookie-mode (default, `SAVE_AUTH_TOKENS = false`)

After the user logs in via HTTP, the backend sets an HttpOnly `access` cookie. When you call `wsClient.connect()`, the browser cookie jar attaches that cookie to the Socket.IO handshake automatically. The backend's three-source token extractor (auth payload → Authorization header → cookie) reads it and authenticates the socket.

You write **no auth-related code** in cookie-mode. Just `useWsEvent` or `wsClient.connect()` and the rest happens transparently.

```tsx
'use client';

import { useWsEvent } from '@/lib/utils/ws';

export function Notifications() {
  // The browser cookie does all the auth work. Just subscribe.
  useWsEvent('error', (err) => console.error(err));
  return null;
}
```

**Limitation in v1:** tokens never touch JS, so the frontend can't drive in-place `auth:token:renew` (the backend handler expects the refresh token in the payload). When the access token expires the socket disconnects, then reconnects with a fresh access cookie that the HTTP layer refreshed on a parallel API call. One sub-second blip; users almost never notice.

#### Bearer-mode (`SAVE_AUTH_TOKENS = true`)

Flip the flag. Now the WS client reads the access token from `secureStorageTokenStore` (`react-secure-storage` wrapper) and sends it as `handshake.auth.token`. The backend's extractor picks that up with highest priority — same code path, different carrier.

Bearer-mode is useful when:
- You're targeting React Native or a webview where cookies don't behave the same way.
- You're integrating with a backend that's CORS-restricted enough that cookie credentials don't flow.
- You need to debug auth by inspecting the token in DevTools.

If `SAVE_AUTH_TOKENS = true` and no token is stored, `wsClient.connect()` rejects with `WS_AUTH_REQUIRED` **before** opening the socket — you don't get a misleading silent failure.

```ts
// After a successful HTTP login that stored the tokens:
await wsClient.connect();
// Or if you don't care about the success/failure boundary:
wsClient.connect().catch(() => { /* the lifecycle emitter already reported */ });
```

#### Anonymous mode (no auth at all)

Opt-in per-call. The backend admits the connection up to a global cap (`WS_MAX_ANONYMOUS_SOCKETS = 10_000` server-side). Only handlers decorated with `@WsPublic()` are reachable — currently `ping`, `presence:subscribe`, `presence:unsubscribe`.

```ts
await wsClient.connect({ anonymous: true });
```

Use this when you want a public-presence widget on a landing page or a "currently online" badge without forcing visitors to sign in.

### Connection lifecycle in practice

Most apps never call `connect()` explicitly — the hooks lazy-trigger it. But there are a few cases where you'll want explicit control:

```tsx
'use client';

import { useEffect } from 'react';
import { wsClient } from '@/lib/utils/ws';

// 1. Connect after auth is known to be ready (avoids racing with login flow):
export function AppShell() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) return;
    wsClient.connect().catch(() => {/* state is mirrored to Redux already */});
    return () => wsClient.disconnect();
  }, [isLoggedIn]);

  return <Layout />;
}

// 2. Connect anonymously for public pages, upgrade to authenticated after login:
export function LandingPage() {
  useEffect(() => {
    wsClient.connect({ anonymous: true });
    return () => wsClient.disconnect({ permanent: true });
  }, []);
  return <Hero />;
}
```

**`disconnect()` vs `disconnect({ permanent: true })`**

- `disconnect()` — closes the socket, but the underlying socket.io Manager remains. Calling `connect()` again reuses it (faster reconnect).
- `disconnect({ permanent: true })` — also removes every listener and nulls out the socket reference. The next `connect()` builds everything from scratch. Use this for logout flows where you want zero state from the previous session to leak forward.

**Status transitions you'll see in the Redux slice:**

```
idle ──connect()──▶ connecting ──handshake ok──▶ connected
                                       │
                                       │ transport closes (network)
                                       ▼
                                  reconnecting ──handshake ok──▶ connected
                                       │
                                       │ user calls disconnect()
                                       │ or server force-disconnect reconnectable=false
                                       ▼
                                  disconnected
```

### Listening to server events

`useWsEvent(event, handler)` is the default tool. It:
- Subscribes on mount.
- Unsubscribes on unmount or when `event` changes.
- Triggers a lazy `connect()` on first mount.
- Uses a stable handler ref internally — inline arrows don't cause re-subscriptions on every render.

```tsx
useWsEvent('presence:online', (payload) => {
  // payload is typed as { userId: string; timestamp: number }
  toast(`${payload.userId} just came online`);
});
```

#### Conditional subscriptions

Pass the event name conditionally only if you really need to — the hook re-subscribes when `event` changes:

```tsx
const event = userId ? 'presence:online' : null;
useWsEvent(event ?? 'presence:online', (p) => { /* still typed */ });
```

Most of the time you want the subscription unconditionally and a guard inside the handler:

```tsx
useWsEvent('presence:online', (payload) => {
  if (payload.userId !== targetUserId) return;
  /* ... */
});
```

#### Multiple subscriptions in one component

Each `useWsEvent` call is independent. The hook handles cleanup individually.

```tsx
useWsEvent('presence:online',  handleOnline);
useWsEvent('presence:offline', handleOffline);
useWsEvent('error',            handleError);
```

#### Subscribing to system events for diagnostics

Useful in dev / debug consoles:

```tsx
useWsEvent('error',                  (e) => console.warn('[ws] error', e));
useWsEvent('auth:error',             (e) => console.error('[ws] auth error', e));
useWsEvent('auth:force:disconnect',  (p) => console.warn('[ws] forced disconnect', p));
useWsEvent('pong',                   ({ timestamp }) => debugRtt(Date.now() - timestamp));
```

### Sending events to the server

`useWsEmit()` returns a stable, fully-typed emit function. It's safe to put in a `useCallback` dependency array.

```tsx
const emit = useWsEmit();
emit('presence:subscribe', { userId });    // returns true / false
```

Return value: `true` when the socket was open and the event was dispatched; `false` when the socket was disconnected (the event is dropped, not queued).

#### Emitting in response to user actions

```tsx
function ChatInput({ roomId }: { roomId: string }) {
  const emit = useWsEmit();
  const [text, setText] = useState('');

  const send = () => {
    // Assuming you've declared 'message:send' via declaration merging:
    const ok = emit('message:send', { roomId, content: text });
    if (!ok) {
      toast('Not connected — try again in a moment');
      return;
    }
    setText('');
  };

  return /* ... */;
}
```

#### Emitting on effect mount (without `useWsEvent`)

If you only need to emit, not subscribe, drive it from `useWsStatus`:

```tsx
function PresenceSubscription({ userId }: { userId: string }) {
  const { isConnected } = useWsStatus();
  const emit = useWsEmit();

  useEffect(() => {
    if (!isConnected) return;
    emit('presence:subscribe', { userId });
    return () => { emit('presence:unsubscribe', { userId }); };
  }, [isConnected, userId, emit]);

  return null;
}
```

**Note:** `useWsEmit` alone does NOT trigger a lazy connect (it can't — there's nothing to subscribe to yet). If you need a socket without subscribing to anything, call `wsClient.connect()` from a `useEffect`. In practice every app subscribes to at least one event somewhere.

### Reading and reacting to connection state

`useWsStatus()` returns each slice field as an independent selector — components only re-render when the field they read changes.

```tsx
const {
  status,                  // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  isConnected,             // boolean — convenience for status === 'connected'
  isDisconnectedFatally,   // true when reconnectable === false (server denial)
  socketId,                // current socket id, or null
  lastError,               // last WsErrorPayload, or null
  forceDisconnectReason,   // WsDisconnectReason | null
  reconnectable,           // boolean | null — branch on this, not on `reason`
} = useWsStatus();
```

#### A connection-status badge

```tsx
function ConnectionBadge() {
  const { status } = useWsStatus();
  const colour = {
    idle: 'gray',
    connecting: 'amber',
    connected: 'green',
    reconnecting: 'amber',
    disconnected: 'red',
  }[status];
  return <Dot colour={colour} title={status} />;
}
```

#### Reacting to fatal disconnects

When the server force-disconnects with `reconnectable: false` (session revoked, rate limited, etc.), `isDisconnectedFatally` flips true. Use it to drive the "you've been signed out" UI:

```tsx
function SessionGuard() {
  const { isDisconnectedFatally, forceDisconnectReason } = useWsStatus();
  const router = useRouter();

  useEffect(() => {
    if (!isDisconnectedFatally) return;
    if (forceDisconnectReason === 'session_revoked') {
      router.push('/login?reason=signed-out-elsewhere');
    } else if (forceDisconnectReason === 'max_connections') {
      toast('Too many devices connected. Close another tab to continue.');
    }
  }, [isDisconnectedFatally, forceDisconnectReason, router]);

  return null;
}
```

#### Reading raw selectors for advanced cases

If `useWsStatus` is too coarse (you only care about one field, want shallow-equal memoisation, etc.), use the named selectors directly with `useAppSelector`:

```tsx
import { useAppSelector } from '@/store/hooks';
import { selectWsLastError } from '@/lib/utils/ws';

const error = useAppSelector(selectWsLastError);
```

### Presence (online/offline tracking)

The backend tracks which users are online via Redis. To watch a specific user, subscribe at the WS level and let the slice / hooks fan the updates out:

```tsx
function UserPresenceDot({ userId }: { userId: string }) {
  const { isConnected } = useWsStatus();
  const emit = useWsEmit();
  const [online, setOnline] = useState<boolean | null>(null);

  // Subscribe / unsubscribe on the WS gateway
  useEffect(() => {
    if (!isConnected) return;
    emit('presence:subscribe', { userId });
    return () => { emit('presence:unsubscribe', { userId }); };
  }, [isConnected, userId, emit]);

  // Snapshot — the server sends this once after subscribe
  useWsEvent('presence:status', ({ userId: uid, status }) => {
    if (uid === userId) setOnline(status === 'online');
  });

  // Live updates
  useWsEvent('presence:online',  ({ userId: uid }) => { if (uid === userId) setOnline(true); });
  useWsEvent('presence:offline', ({ userId: uid }) => { if (uid === userId) setOnline(false); });

  return <Dot colour={online ? 'green' : online === false ? 'gray' : 'transparent'} />;
}
```

**Per-socket cap:** 50 presence subscriptions (backend-enforced). If you need to watch more users, design around it — e.g. subscribe to a room and let the server fan out, rather than subscribing to every user individually.

### Handling server-initiated disconnects

The backend can force a disconnect for several reasons. **Always branch on `reconnectable`, never on `reason`** — the reason is for logs/UX; the boolean is the contract.

| `reason` | `reconnectable` | Client behaviour | UI guidance |
|---|---|---|---|
| `session_revoked` | `false` | Auto-reconnect is **disabled** | Route to login; clear in-memory user state |
| `max_connections` | `false` | Auto-reconnect is **disabled** | Show "device limit reached"; suggest closing other tabs |
| `rate_limited` | `false` | Auto-reconnect is **disabled** | Show "too many connection attempts"; back off ~60 s before letting the user retry |
| `roles_changed` | `true` | Socket.IO reconnects transparently | No UI; permissions refresh on the new handshake |
| `max_age` | `true` | Socket.IO reconnects transparently | No UI |
| `server_shutdown` | `true` | Socket.IO reconnects transparently | No UI; new connection lands on a healthy node |

You typically only need a single top-level component handling all of these:

```tsx
function WsForceDisconnectHandler() {
  const { forceDisconnectReason, reconnectable } = useWsStatus();
  const router = useRouter();

  useEffect(() => {
    if (!forceDisconnectReason) return;
    if (reconnectable) return; // operational — Socket.IO handles it

    switch (forceDisconnectReason) {
      case 'session_revoked':
        clearAuthState();
        router.push('/login?reason=signed-out-elsewhere');
        break;
      case 'max_connections':
        toast.error('Maximum device limit reached. Close another tab.');
        break;
      case 'rate_limited':
        toast.error('Too many connection attempts. Try again in a minute.');
        break;
    }
  }, [forceDisconnectReason, reconnectable, router]);

  return null;
}
```

Mount it once near the root of the authenticated app shell.

### Public / anonymous flows

Anonymous mode reaches only `@WsPublic()` handlers. The backend currently exposes `ping`, `presence:subscribe`, and `presence:unsubscribe` as public — enough to build a "live visitor count" or public-presence widget without forcing authentication.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useWsEvent, wsClient } from '@/lib/utils/ws';

export function LandingPagePresenceCount() {
  const [online, setOnline] = useState(0);

  useEffect(() => {
    // Open a public socket on mount, close on unmount.
    wsClient.connect({ anonymous: true });
    return () => wsClient.disconnect({ permanent: true });
  }, []);

  useWsEvent('presence:online',  () => setOnline((n) => n + 1));
  useWsEvent('presence:offline', () => setOnline((n) => Math.max(0, n - 1)));

  return <span>{online} people online</span>;
}
```

**Upgrading from anonymous to authenticated after login:** call `wsClient.disconnect({ permanent: true })` first, then `wsClient.connect()` (without `anonymous`). The handshake re-runs with credentials.

### Multi-namespace apps

The default `wsClient` connects to `/ws`. For separate gateways like `/chat` or `/notifications`, create dedicated clients with `createWsClient`:

```ts
// src/features/chat/client.ts
import { createWsClient } from '@/lib/utils/ws';

export const chatWsClient = createWsClient({ namespace: '/chat' });
```

Each client is an independent `WsClient` instance with its own socket, heartbeat, and lifecycle. They share the same `socket.io-client` Manager only if you pass the same URL — by default, separate URLs mean separate Managers.

The default Redux bridge is wired to `wsClient` only. If you want connection state for a custom client in Redux too, wire your own bridge in a custom slice — the `attachWsBridge` function works against any `WsClient`. Alternatively, keep the custom client's state local to its feature.

```ts
// Custom slice for chat connection state
import { attachWsBridge } from '@/lib/utils/ws';
import { chatWsClient } from '@/features/chat/client';

// Inside a provider effect:
useEffect(() => attachWsBridge(chatWsClient, dispatch), [dispatch]);
```

### Adding custom feature events

The backend's `ClientToServerEvents` / `ServerToClientEvents` are the contract. To extend on the frontend, use TypeScript declaration merging — keep the merge file near the feature that introduces the event:

```ts
// src/features/chat/types/ws-events.ts
import '@/lib/utils/ws'; // ensure base interface is loaded

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

Import that file once at app load (e.g. from a root `app/[locale]/layout.tsx` or a `features/<feature>/index.ts` barrel that's already imported). Then in any feature file:

```tsx
const emit = useWsEmit();
emit('message:send', { roomId, content });   // fully typed

useWsEvent('message:new', (msg) => {           // fully typed
  appendToTimeline(msg);
});
```

**Coordinate with the backend.** Events not declared on the backend's gateway are silently dropped on the server. Add the `@SubscribeMessage` handler there first; then add the frontend declarations.

### Imperative use outside React

The `wsClient` singleton is callable from anywhere in the browser bundle. Useful for non-React code paths — analytics, debug consoles, Redux thunks, etc.

```ts
import { wsClient } from '@/lib/utils/ws';

// In a Redux thunk:
export const sendChatMessage = (roomId: string, content: string) =>
  (dispatch, getState) => {
    if (!wsClient.isConnected()) {
      dispatch(showError('Not connected'));
      return;
    }
    wsClient.emit('message:send', { roomId, content });
  };

// In a debug-console helper exposed for QA:
declare global { interface Window { __ws: typeof wsClient } }
window.__ws = wsClient;
```

`wsClient` works correctly even before any React component renders — it's a lazy proxy. The first method call constructs the underlying instance.

### Cleanup on logout

A typical logout flow with WS state:

```ts
async function logout() {
  // 1. Disconnect WS permanently — drop all listeners + socket reference.
  wsClient.disconnect({ permanent: true });

  // 2. Reset the WS slice to clear stale status / lastError / etc.
  store.dispatch(wsReset());

  // 3. Hit the HTTP logout endpoint — clears the access/refresh cookies.
  await fetchClient.post('/auth/logout');

  // 4. Clear any in-memory auth state (Redux auth slice, secure storage in bearer mode).
  store.dispatch(authReset());

  // 5. Route to login.
  router.push('/login');
}
```

**Why `permanent: true`?** A plain `disconnect()` keeps the Manager alive so a future `connect()` is faster. But on logout, you want zero state from the previous session — including any in-flight reconnection attempts. `permanent: true` guarantees a clean slate.

### Testing components that use the WS layer

The test environment already mocks `react-secure-storage` globally (`test/setup.ts`). For component tests, mock `wsClient` per-test so you can assert on subscribe/emit calls without opening a real socket:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '../../test/test-utils';

const onEventMock = vi.fn();
const emitMock = vi.fn().mockReturnValue(true);
const getStatusMock = vi.fn().mockReturnValue('connected');

vi.mock('@/lib/utils/ws/client', () => ({
  wsClient: {
    onEvent: (...args) => { onEventMock(...args); return () => {}; },
    emit: emitMock,
    getStatus: getStatusMock,
    connect: vi.fn().mockResolvedValue(undefined),
  },
}));

const { useWsEvent, useWsEmit } = await import('@/lib/utils/ws');

describe('MyChatPanel', () => {
  it('subscribes to message:new and emits message:send', () => {
    const { result } = renderHook(() => /* ... */, { wrapper: TestProviders });
    expect(onEventMock).toHaveBeenCalledWith('message:new', expect.any(Function));

    act(() => { result.current.send('hi'); });
    expect(emitMock).toHaveBeenCalledWith('message:send', { content: 'hi' });
  });
});
```

For end-to-end-style tests of the client itself (not feature code), see `src/lib/utils/ws/client/ws-client.test.ts` and the `FakeSocket` test utility in `src/lib/utils/ws/__test-utils__/fake-socket.ts`.

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

### Selectors

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

### "Sessions revoked when I refresh the page"

Cookie-mode relies on the browser carrying the access cookie. If your dev setup has frontend on a different origin from the backend (e.g. `localhost:3000` vs `localhost:8080`), check the backend's `COOKIE_SAMESITE` and `COOKIE_DOMAIN`.

### "Connection drops every ~2 minutes"

Application-level heartbeat isn't reaching the server. The client sends `ping` every 25 s — if a corporate proxy or service-worker is blocking outgoing pings, the backend's Redis socket TTL (default 120 s) expires and the next push event finds no socket. Check that `transports: ['websocket']` is actually negotiated (look for `Sec-WebSocket-Protocol` in DevTools) and that no service worker is intercepting `/ws`.

### Tests fail with "Cannot set properties of null (setting 'textBaseline')"

`react-secure-storage` constructs its encryption service at import time and calls `<canvas>.getContext`, which jsdom doesn't implement. Already handled — `test/setup.ts` stubs `react-secure-storage` globally. If you hit this in a fresh test file, make sure your test config uses `test/setup.ts` as `setupFiles`.

### "Two sockets open at once during dev"

React 18+ in Strict Mode double-invokes effects in dev. The lazy-connect path is idempotent (a second `connect()` while connecting is a no-op), but if you wrote your own `useEffect` calling `wsClient.connect()`, make sure the cleanup function calls `wsClient.disconnect()` — Strict Mode's teardown-then-rerun is the safety check for exactly this kind of bug.

---

## Related docs

- Backend WS contract → `nestjs-starter/docs/socket.md`
- Event interfaces (source of truth) → `nestjs-starter/src/infrastructure/websocket/types/ws-events.interface.ts`
- Disconnect reasons + reconnectable policy → `nestjs-starter/src/infrastructure/websocket/websocket.constants.ts`
- HTTP layer (sibling) → `src/lib/utils/http/README.md`
