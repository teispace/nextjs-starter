import { describe, expect, it } from 'vitest';

import { isBrowser, isServer } from './runtime';

describe('runtime detection', () => {
  // Vitest runs with `environment: 'jsdom'`, so `window` is defined and
  // we should detect "browser". This guards against accidental regressions
  // (e.g. swapping the implementation to typeof document, which jsdom also
  // sets, but which subtly differs in edge runtimes).
  it('detects browser environment under jsdom', () => {
    expect(isBrowser()).toBe(true);
    expect(isServer()).toBe(false);
  });

  it('isServer is the inverse of isBrowser', () => {
    expect(isServer()).toBe(!isBrowser());
  });
});
