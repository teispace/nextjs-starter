# Client state

The store is the smallest of the four data surfaces, and keeping it small is
the point. Most of what a page shows is server data, and server data belongs
to the data access layer and TanStack Query, which already handle caching,
revalidation, and staleness. Duplicating it into a client store means owning
those problems twice.

## What belongs here

| Belongs in the store | Does not |
| :-- | :-- |
| A wizard's current step and partial answers | The record the wizard eventually saves |
| A filter, sort, or view toggle the user picked | The rows that come back for those filters |
| An unsent draft, kept across a reload | Anything the server already knows |
| The theme or layout preference | The signed-in user |
| Socket connection status | Messages the socket delivers, if the server owns them |

The test: if the value could be wrong after someone else changes something,
it is server data. Keep it in the DAL or a query, not here.

## Redux, Zustand, or neither

A project uses exactly one, chosen at creation and switchable later with
`next-maker setup --set state=zustand`. The packages for the other are not
installed. Redux Toolkit is the default because `combineSlices`, the
listener middleware, and the devtools timeline scale well when many people
work on one codebase. Zustand is the lighter option when the store stays
small. `state=none` removes the store entirely, which is right for an app
whose client state is one or two `useState` calls.

Everything below shows Redux, since that is the default; the Zustand variant
mirrors it with slice creators instead of `createSlice`.

## A slice

```bash
pnpm exec next-maker slice cart --persist
```

```ts
// src/store/slices/cart/cart.slice.ts
export const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    added: (state, action: PayloadAction<CartItem>) => {
      state.items.push(action.payload);
    },
    removed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
  selectors: {
    selectItems: (state) => state.items,
    selectCount: (state) => state.items.length,
  },
});
```

Slices are registered in `src/store/rootReducer.ts` through `combineSlices`,
which also allows injecting a slice lazily from a code-split route with
`rootReducer.inject(slice)`. The generator registers it for you.

Read and write with the typed hooks, never the untyped React Redux ones:

```tsx
'use client';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const items = useAppSelector(cartSlice.selectors.selectItems);
const dispatch = useAppDispatch();
dispatch(cartSlice.actions.added(item));
```

## Persistence

Persistence is declared per slice and applied once in `src/store/index.ts`.
There is no `PersistGate`, and nothing is written to storage on every action.

```ts
export const cartPersistence = definePersistence<CartState>({
  key: 'cart',
  version: 1,
  pick: ['items'],        // only these fields are stored
  migrations: {},         // keyed by the version they migrate *to*
});
```

Four properties are worth understanding:

- **Versioned envelopes.** Storage holds `{ v, data }`. A stored version
  older than the current one is migrated forward one step at a time.
- **Forward migrations.** Add a step keyed by the new version when the
  persisted shape changes, and bump `version`. Return `undefined` from a step
  to discard a payload you cannot rescue.
- **Debounced writes,** flushed on `pagehide`, so a fast typist does not
  write to storage on every keystroke but nothing is lost on navigation.
- **`pick` is a whitelist.** Anything not listed stays in memory, which keeps
  transport and derived state out of storage.

### The hydration rule

The server renders with the initial state; the browser rehydrates after
mount. Rendering a persisted value directly would produce markup that does
not match, so gate anything whose persisted value can differ from the
server's:

```tsx
'use client';
const hydrated = useAppHydrated();
const count = useAppSelector(counterSlice.selectors.selectValue);

return <span>{hydrated ? count : 0}</span>;
```

Skip the gate only when the persisted value cannot differ from the initial
one on first paint.

## The store is per request and per tab

`makeStore()` is called by `StoreProvider`, so the server builds one store
per request and the browser one per tab. Nothing is module-global, which is
what keeps one visitor's state from leaking into another's render.

Preloaded state is how the server hands a starting value to the client:

```tsx
<StoreProvider preloadedState={{ cart: { items: serverItems } }}>
```

Use it for state the server genuinely knows. It is not a way to smuggle
server data past the query layer.

## Realtime state

The websocket layer keeps its connection status in the store through a bridge
(`attachWsBridge`), which is transport state, not server data. It is
deliberately never persisted: restoring `connected: true` on first paint
would be a lie about a socket that has not opened yet. Application messages
that arrive over the socket usually belong in the query cache instead, so
that one source of truth serves both the fetch and the push.

## Testing a slice

Reducers are pure functions, so they need no harness:

```ts
it('removes the item', () => {
  const state = cartSlice.reducer(
    { items: [{ id: 'a' }, { id: 'b' }] },
    cartSlice.actions.removed('a'),
  );
  expect(state.items).toEqual([{ id: 'b' }]);
});
```

For a component that reads the store, `renderWithProviders` from
`test/test-utils.tsx` wraps it in a fresh store and the other providers.
Component tests are `*.test.tsx` so they run in the jsdom project.
