import { describe, expect, it } from 'vitest';

import { prepareBody } from './body';

describe('prepareBody', () => {
  it('sends nothing for undefined', () => {
    expect(prepareBody(undefined)).toEqual({ body: undefined, contentType: undefined });
  });

  it('JSON-encodes plain data, including falsy primitives and null', () => {
    expect(prepareBody({ a: 1 })).toEqual({ body: '{"a":1}', contentType: 'application/json' });
    expect(prepareBody(0)).toEqual({ body: '0', contentType: 'application/json' });
    expect(prepareBody(false)).toEqual({ body: 'false', contentType: 'application/json' });
    expect(prepareBody(null)).toEqual({ body: 'null', contentType: 'application/json' });
    expect(prepareBody([1, 2])).toEqual({ body: '[1,2]', contentType: 'application/json' });
  });

  it('passes FormData, Blob, URLSearchParams and binary through with no content type', () => {
    const form = new FormData();
    form.set('file', 'x');
    expect(prepareBody(form)).toEqual({ body: form, contentType: undefined });
    const blob = new Blob(['x']);
    expect(prepareBody(blob)).toEqual({ body: blob, contentType: undefined });
    const params = new URLSearchParams('a=1');
    expect(prepareBody(params)).toEqual({ body: params, contentType: undefined });
    const bytes = new Uint8Array([1, 2]);
    expect(prepareBody(bytes)).toEqual({ body: bytes, contentType: undefined });
  });

  it('sends strings as text', () => {
    expect(prepareBody('hello')).toEqual({
      body: 'hello',
      contentType: 'text/plain;charset=UTF-8',
    });
  });
});
