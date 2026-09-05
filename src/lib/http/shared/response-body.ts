/**
 * Read a response body according to its status and content type.
 *
 * - `204`, `205`, `304`, and empty bodies resolve to `undefined` so a `DELETE`
 *   typed as `void` does not hand the caller a `Blob`.
 * - JSON is parsed; a malformed JSON body resolves to `undefined` and the
 *   status decides whether that is an error.
 * - Text types resolve to a string; anything else to a `Blob`.
 */
export const readResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return undefined;
  }
  if (response.headers.get('content-length') === '0') return undefined;

  const contentType = response.headers.get('content-type') ?? '';

  if (/[/+]json\b/i.test(contentType)) {
    const text = await response.text();
    if (text.length === 0) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  }

  if (/^text\//i.test(contentType)) return response.text();

  const blob = await response.blob();
  return blob.size === 0 ? undefined : blob;
};
