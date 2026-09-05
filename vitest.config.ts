import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = { '@': new URL('./src', import.meta.url).pathname };

// Two projects so only component tests pay for a DOM: jsdom boot dominated the
// old single-environment run (15 s of environment time for a 3 s suite).
// `.test.ts` runs in node; `.test.tsx` runs in jsdom with Testing Library.
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
          setupFiles: ['./test/setup.node.ts'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'test/**/*.test.tsx'],
          setupFiles: ['./test/setup.dom.ts'],
          css: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/index.ts',
        'src/**/__test-utils__/**',
        'src/app/**',
        'src/types/**',
      ],
      // A ratchet, not a target: set a few points under where the suite sits
      // so ordinary churn stays green while a real regression fails. Raise it
      // when coverage rises; never lower it to make CI pass.
      thresholds: { lines: 65, branches: 55, functions: 60, statements: 65 },
    },
  },
});
