/**
 * Turn a caller-supplied body into something `fetch` accepts, and decide
 * whether a JSON content type should be attached.
 *
 * Only plain data is JSON-encoded. `FormData`, `Blob`, `ArrayBuffer`,
 * `URLSearchParams`, `ReadableStream`, and strings pass through untouched so
 * the runtime sets the right content type (multipart boundaries in
 * particular must never be overwritten). Falsy primitives such as `0` and
 * `false` are valid JSON bodies and are encoded, not dropped.
 */
export interface PreparedBody {
  body: BodyInit | undefined;
  contentType: string | undefined;
}

const isBodyInit = (value: unknown): value is BodyInit =>
  typeof value === 'string' ||
  value instanceof FormData ||
  value instanceof Blob ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value) ||
  value instanceof URLSearchParams ||
  (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream);

export const prepareBody = (data: unknown): PreparedBody => {
  if (data === undefined) return { body: undefined, contentType: undefined };
  if (isBodyInit(data)) {
    return {
      body: data,
      contentType: typeof data === 'string' ? 'text/plain;charset=UTF-8' : undefined,
    };
  }
  return { body: JSON.stringify(data), contentType: 'application/json' };
};
