import { vi } from 'vitest';

// `server-only` throws at module load outside a Next.js server bundle; the
// real package relies on a bundler redirect. Stub it so unit tests can reach
// server-side modules. Production builds are unaffected.
vi.mock('server-only', () => ({}));
