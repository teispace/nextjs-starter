import {
  createAction,
  createListenerMiddleware,
  createSlice,
  type Reducer,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { logger } from '@/lib/logger';

/**
 * Slice persistence built on Redux Toolkit's listener middleware.
 *
 * Replaces `redux-persist` (unmaintained since 2019). Each persisted slice
 * declares a `definePersistence` entry: which fields to store, the schema
 * version, and migrations between versions. The store writes changed slices
 * to storage after a short debounce and rehydrates them once on the client
 * after mount, so server renders and the first client render agree and no
 * gate component is needed.
 *
 * Storage payloads are versioned envelopes: `{ v: number, data: unknown }`.
 * A stored version older than the current one is migrated forward one step
 * at a time; a newer one (a rollback) is discarded rather than trusted.
 */

export interface PersistStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** Transform the persisted shape from `version - 1` to `version`. Return `undefined` to discard. */
export type Migration = (previous: unknown) => unknown;

export interface PersistenceEntry<TState = unknown> {
  /** Slice key in the root state and suffix of the storage key. */
  readonly key: string;
  /** Bump whenever the persisted shape changes; add a migration for the new number. */
  readonly version: number;
  /** Keyed by the version they migrate *to*. */
  readonly migrations?: Readonly<Record<number, Migration>>;
  /** Subset of fields to persist. Omit to persist the whole slice. */
  readonly pick?: readonly (keyof TState & string)[];
}

export const definePersistence = <TState>(
  entry: PersistenceEntry<TState>,
): PersistenceEntry<TState> => entry;

/** Entry with its slice type erased, for registries that hold many slices. */
export type AnyPersistenceEntry = PersistenceEntry<never>;

interface Envelope {
  v: number;
  data: unknown;
}

export const rehydrated = createAction<{ key: string; state: unknown }>('persist/rehydrated');
export const hydrationFinished = createAction('persist/hydrationFinished');

/** Tracks whether client-side rehydration has completed. */
export const persistSlice = createSlice({
  name: 'persist',
  initialState: { hydrated: false },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(hydrationFinished, (state) => {
      state.hydrated = true;
    });
  },
});

export interface PersistenceOptions {
  storage: PersistStorage;
  entries: readonly AnyPersistenceEntry[];
  /** Storage key prefix, so several apps on one origin do not collide. */
  prefix?: string;
  /** Debounce for writes; bursts of actions produce one write per slice. */
  debounceMs?: number;
}

const storageKey = (prefix: string, key: string): string => `${prefix}:${key}`;

const migrate = (entry: AnyPersistenceEntry, envelope: Envelope): unknown => {
  if (envelope.v > entry.version) return undefined;
  let data = envelope.data;
  for (let v = envelope.v + 1; v <= entry.version; v++) {
    const step = entry.migrations?.[v];
    if (!step) return undefined;
    data = step(data);
    if (data === undefined) return undefined;
  }
  return data;
};

const pick = (entry: AnyPersistenceEntry, sliceState: unknown): unknown => {
  if (!entry.pick || typeof sliceState !== 'object' || sliceState === null) return sliceState;
  const source = sliceState as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of entry.pick) out[field] = source[field];
  return out;
};

export function createPersistence(options: PersistenceOptions) {
  const { storage, entries, prefix = 'app', debounceMs = 250 } = options;
  const keys = new Set(entries.map((e) => e.key));

  // Slices changed since the last write. Tracked so a flush on `pagehide`
  // can persist synchronously without waiting for the debounce, which is
  // what keeps a change made just before a reload or navigation.
  const dirty = new Set<string>();
  let latest: Record<string, unknown> | null = null;

  const writeDirty = async (): Promise<void> => {
    if (!latest) return;
    for (const entry of entries) {
      if (!dirty.has(entry.key)) continue;
      dirty.delete(entry.key);
      const envelope: Envelope = { v: entry.version, data: pick(entry, latest[entry.key]) };
      try {
        await storage.setItem(storageKey(prefix, entry.key), JSON.stringify(envelope));
      } catch (err) {
        logger.debug({ err, key: entry.key }, 'persistence write failed');
      }
    }
  };

  const listener = createListenerMiddleware();
  listener.startListening({
    predicate: (_action, current, previous) => {
      const next = current as Record<string, unknown>;
      const prev = previous as Record<string, unknown>;
      let changed = false;
      for (const key of keys) {
        if (next[key] !== prev[key]) {
          dirty.add(key);
          changed = true;
        }
      }
      if (changed) latest = next;
      return changed;
    },
    effect: async (_action, api) => {
      api.cancelActiveListeners();
      await api.delay(debounceMs);
      await writeDirty();
    },
  });

  /** Write pending changes now. Called on `pagehide`; safe to call any time. */
  const flush = (): Promise<void> => writeDirty();

  /**
   * Wrap the root reducer so `persist/rehydrated` merges a stored slice over
   * its current state. Slices stay unaware of persistence; lazily injected
   * slices keep working because everything else delegates to `root`.
   */
  const reducer = <S extends Record<string, unknown>>(root: Reducer<S>): Reducer<S> => {
    return (state, action: UnknownAction) => {
      const base = root(state, action);
      if (rehydrated.match(action) && keys.has(action.payload.key)) {
        const key = action.payload.key as keyof S;
        const current = base[key];
        const merged =
          typeof current === 'object' && current !== null
            ? { ...(current as object), ...(action.payload.state as object) }
            : action.payload.state;
        return { ...base, [key]: merged };
      }
      return base;
    };
  };

  /**
   * Read every entry from storage, migrate, and dispatch. Client-only; call
   * once after mount. Also arms the `pagehide` flush so the last change
   * before a navigation is not lost to the debounce.
   */
  const hydrate = async (dispatch: (action: UnknownAction) => unknown): Promise<void> => {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => void flush(), { passive: true });
    }
    for (const entry of entries) {
      try {
        const raw = await storage.getItem(storageKey(prefix, entry.key));
        if (!raw) continue;
        const envelope = JSON.parse(raw) as Partial<Envelope>;
        if (typeof envelope.v !== 'number') continue;
        const data = migrate(entry, envelope as Envelope);
        if (data === undefined) {
          await storage.removeItem(storageKey(prefix, entry.key));
          continue;
        }
        dispatch(rehydrated({ key: entry.key, state: data }));
      } catch (err) {
        logger.debug({ err, key: entry.key }, 'persistence read failed');
      }
    }
    dispatch(hydrationFinished());
  };

  /** Remove every persisted slice from storage (logout, reset). */
  const purge = async (): Promise<void> => {
    for (const entry of entries) {
      try {
        await storage.removeItem(storageKey(prefix, entry.key));
      } catch (err) {
        logger.debug({ err, key: entry.key }, 'persistence purge failed');
      }
    }
  };

  return { middleware: listener.middleware, reducer, hydrate, flush, purge };
}
