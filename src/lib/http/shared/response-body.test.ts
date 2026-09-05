import { describe, expect, it } from 'vitest';

import { readResponseBody } from './response-body';

const res = (body: BodyInit | null, init: ResponseInit) => new Response(body, init);

describe('readResponseBody', () => {
  it('resolves no-content statuses to undefined', async () => {
    expect(await readResponseBody(res(null, { status: 204 }))).toBeUndefined();
    expect(await readResponseBody(res(null, { status: 205 }))).toBeUndefined();
    expect(await readResponseBody(res(null, { status: 304 }))).toBeUndefined();
  });

  it('parses JSON, including vendor suffixes, and tolerates malformed JSON', async () => {
    expect(
      await readResponseBody(res('{"a":1}', { headers: { 'content-type': 'application/json' } })),
    ).toEqual({ a: 1 });
    expect(
      await readResponseBody(
        res('{"a":1}', { headers: { 'content-type': 'application/problem+json; charset=utf-8' } }),
      ),
    ).toEqual({ a: 1 });
    expect(
      await readResponseBody(res('{oops', { headers: { 'content-type': 'application/json' } })),
    ).toBeUndefined();
    expect(
      await readResponseBody(res('', { headers: { 'content-type': 'application/json' } })),
    ).toBeUndefined();
  });

  it('returns text for text types and a Blob for anything else', async () => {
    expect(await readResponseBody(res('hi', { headers: { 'content-type': 'text/plain' } }))).toBe(
      'hi',
    );
    const blob = await readResponseBody(
      res(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'application/octet-stream' } }),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).size).toBe(3);
  });
});
