import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `react-secure-storage` constructs an `EncryptionService` at module load
// that fingerprints the browser via `<canvas>.getContext`. jsdom doesn't
// implement canvas, so the import explodes anywhere it's pulled in
// transitively (HTTP token store, WS auth carrier, etc.). Stub it globally —
// tests that need real behaviour are integration tests, not unit tests.
vi.mock('react-secure-storage', () => {
  const store = new Map<string, unknown>();
  return {
    default: {
      setItem: (k: string, v: unknown) => store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  };
});

// `server-only` throws at module load outside a Next.js server bundle —
// the package relies on bundler-level redirect to a no-op file in server
// environments. Vitest doesn't do that redirect, so we stub it as a no-op
// to let unit tests reach the server-side modules. Production builds are
// unaffected; Next.js still routes `server-only` to its real implementation.
vi.mock('server-only', () => ({}));

afterEach(() => {
  cleanup();
});
