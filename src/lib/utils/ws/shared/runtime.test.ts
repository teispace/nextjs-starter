import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureBrowser, isBrowser, isServer, WsSsrError } from './runtime';

describe('ws runtime guard', () => {
  it('detects browser environment under jsdom', () => {
    expect(isBrowser()).toBe(true);
    expect(isServer()).toBe(false);
  });

  it('ensureBrowser is a no-op in the browser', () => {
    expect(() => ensureBrowser('connect')).not.toThrow();
  });

  describe('SSR simulation', () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // @ts-expect-error — deleting for SSR simulation
      delete globalThis.window;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('isBrowser returns false; isServer returns true', () => {
      expect(isBrowser()).toBe(false);
      expect(isServer()).toBe(true);
    });

    it('ensureBrowser throws a WsSsrError naming the calling method', () => {
      try {
        ensureBrowser('connect');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WsSsrError);
        expect((err as WsSsrError).message).toMatch(/connect\(\) was called in a server context/);
        expect((err as WsSsrError).code).toBe('WS_SSR_BLOCKED');
      }
    });
  });
});
