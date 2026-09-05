/**
 * `HeadersInit` comes in three shapes (a `Headers` instance, a tuple array,
 * or a plain record). Everything in the client works on real `Headers` so
 * lookups are case-insensitive and nothing is silently dropped by a spread.
 */
export const toHeaders = (init?: HeadersInit): Headers => new Headers(init ?? undefined);

/** Later sources win; `undefined` values delete the header. */
export const mergeHeaders = (...sources: (HeadersInit | undefined)[]): Headers => {
  const out = new Headers();
  for (const source of sources) {
    if (!source) continue;
    const headers = toHeaders(source);
    headers.forEach((value, key) => {
      out.set(key, value);
    });
  }
  return out;
};
