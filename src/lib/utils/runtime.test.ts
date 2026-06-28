import { afterEach, describe, expect, it } from 'vitest';

import { isBrowser, isServer } from './runtime';

describe('runtime detection', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('reports browser when window is defined', () => {
    expect(isBrowser()).toBe(true);
    expect(isServer()).toBe(false);
  });

  it('reports server when window is undefined', () => {
    // @ts-expect-error — deleting for SSR simulation
    delete globalThis.window;
    expect(isBrowser()).toBe(false);
    expect(isServer()).toBe(true);
  });
});
