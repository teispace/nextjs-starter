/**
 * Cancellation + timeout primitives shared by both HTTP clients.
 *
 * Two failure modes need to be told apart from an ordinary network error so
 * the UI can react correctly (don't toast an error when the user navigated
 * away; show "timed out, retry?" rather than a generic failure):
 *
 *   - **Caller abort** — the consumer passed an `AbortSignal` and aborted it.
 *   - **Timeout** — the request outran its time budget.
 *
 * Both surface as an `ApiException` with `status: 0` and a distinct `code`
 * (`ERR_CANCELLED` / `ERR_TIMEOUT`), built via `ApiException.cancelled()` /
 * `.timeout()`. This module owns the detection + signal-merging logic so the
 * fetch and axios adapters stay identical in behaviour.
 *
 * Side-effect-free and tiny so it tree-shakes into both bundles.
 */
import { ApiException } from '@/lib/errors';

/** A timeout of `0` (or negative/NaN) means "no timeout" — unbounded wait. */
function isUnbounded(timeoutMs: number | undefined): boolean {
  return timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0;
}

/**
 * Compose the caller's `AbortSignal` (if any) with a timeout signal (if a
 * positive budget is set) into a single signal to hand to `fetch`.
 *
 * - No caller signal, no timeout → `undefined` (nothing to wire).
 * - Only one of the two → that signal, untouched (no needless wrapper).
 * - Both → `AbortSignal.any([...])`, which aborts as soon as *either* fires.
 *
 * The returned `isTimeout()` lets the caller classify a post-hoc abort: when
 * the merged signal has aborted, was it the timeout or the caller? We can't
 * always read `signal.reason` reliably across runtimes, so we expose the
 * timeout signal's own state instead.
 */
export function buildAbortSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): { signal: AbortSignal | undefined; isTimeout: () => boolean } {
  const timeoutSignal = isUnbounded(timeoutMs)
    ? undefined
    : AbortSignal.timeout(timeoutMs as number);

  const isTimeout = (): boolean => timeoutSignal?.aborted ?? false;

  // Merge only when both exist; otherwise pass through whichever is present
  // (or `undefined` when neither is) so we never wrap a lone signal needlessly.
  const present = [callerSignal, timeoutSignal].filter((s): s is AbortSignal => s !== undefined);

  if (present.length === 0) return { signal: undefined, isTimeout };
  if (present.length === 1) return { signal: present[0], isTimeout };

  return { signal: AbortSignal.any(present), isTimeout };
}

/**
 * Whether a thrown value is an abort/timeout (as opposed to a real network
 * failure). `fetch` rejects with a `DOMException` named `AbortError` on
 * abort and `TimeoutError` when an `AbortSignal.timeout()` fires.
 */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

/**
 * Convert a thrown `fetch` rejection into the right typed `ApiException`.
 * Returns `null` when the error is *not* an abort/timeout, so the caller can
 * fall through to its normal network-error handling.
 *
 * `preferTimeout` disambiguates the abort case: a fetch `AbortError` doesn't
 * itself say whether the abort came from the caller or the timeout, so the
 * adapter passes the timeout signal's state in.
 */
export function abortToApiException(error: unknown, preferTimeout: boolean): ApiException | null {
  if (!isAbortError(error)) return null;

  const isTimeout =
    preferTimeout || (error instanceof DOMException && error.name === 'TimeoutError');
  const stack = error instanceof Error ? error.stack : undefined;

  return isTimeout
    ? ApiException.timeout(undefined, stack)
    : ApiException.cancelled(undefined, stack);
}
