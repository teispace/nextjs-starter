# Results and errors

Every call through the HTTP layer resolves. None of them throw. That single
decision shapes how the rest of the application handles failure, so it is
worth understanding before writing much code.

## Why a value and not an exception

A thrown transport error is invisible in the type system: nothing tells you
which calls can fail, and the compiler is equally happy whether you handle it
or not. Failure here is not exceptional, it is the second ordinary outcome of
talking to a network, so it is in the return type:

```ts
export type Ok<T> = { readonly ok: true; readonly data: T };
export type Fail<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = HttpError> = Ok<T> | Fail<E>;
```

It is a plain object rather than a class on purpose. Results cross the Server
Component boundary, come back from Server Actions, and can sit in store
state, and all three require values that survive serialization.

## Reading one

Narrow on `ok`. After the check, TypeScript knows which half you are in.

```ts
const result = await serverHttp.get<Invoice>(AppApis.invoice.byId(id), { schema });

if (!result.ok) {
  if (result.error.isNotFound()) notFound();
  if (result.error.isUnauthorized()) redirect('/auth/login');
  throw result.error;           // hand it to the segment's error.tsx
}

return result.data;             // Invoice
```

Four endings, and choosing between them is the whole job:

| Ending | Use when |
| :-- | :-- |
| A fallback value | The page is still meaningful without this data. A sidebar, a count, a recommendation. |
| `notFound()` | The resource genuinely does not exist for this visitor. |
| `redirect()` | The visitor needs to be somewhere else first, usually signed in. |
| `throw` | The page cannot render, and the nearest boundary should say so. |

## Helpers

Import from `@/types`. Use them when they read better than an `if`, not as a
matter of course.

```ts
import { match, unwrapOr, mapOk } from '@/types';

// A fallback in one line.
const settings = unwrapOr(await getSettings(), DEFAULT_SETTINGS);

// Both halves, exhaustively, as an expression.
const label = match(result, {
  ok: (invoice) => invoice.reference,
  fail: (error) => (error.isNotFound() ? 'Deleted' : 'Unavailable'),
});

// Transform the success and leave the failure alone.
const names = mapOk(result, (invoices) => invoices.map((i) => i.customerName));
```

`fromPromise` wraps a promise that throws into a result, which is how you
bring a third-party client into the same convention.

## The error types

| Type | Thrown by | Carries |
| :-- | :-- | :-- |
| `HttpError` | Every transport call, as `result.error` | `status`, `code`, `message`, `details`, and predicates |
| `ResponseValidationError` | A response that fails its zod schema | `issues`, the exact paths that disagreed |
| `AppError` | Your own domain failures | Whatever you give it; the base for custom errors |
| `ActionError` | A Server Action, as `result.serverError` | A plain `{ code, message, details }`, safe to render |

`HttpError` answers questions rather than exposing raw numbers:
`isUnauthorized()`, `isForbidden()`, `isNotFound()`, `isServerError()`,
`isClientFailure()`, `isTimeout()`, `isNetworkError()`, `isCancelled()`.
Prefer them over comparing `status`; a transport failure has no status at
all, and `isServerError()` already means "retrying might help".

```ts
if (!result.ok) {
  const { error } = result;
  if (error.isTimeout() || error.isNetworkError()) return renderRetryPrompt();
  if (error.isServerError()) throw error;
  return renderEmptyState();
}
```

## Schema failures are transport failures

Give a call a `schema` and a response that does not match becomes an ordinary
failure with the code `ERR_RESPONSE_INVALID`, before any component sees it:

```ts
const result = await publicServerHttp.get(AppApis.plan.list, { schema: planListSchema });

if (!result.ok && result.error instanceof ResponseValidationError) {
  // error.issues → [{ path: 'plans.0.price', message: 'Expected number, received string' }]
  logger.error({ issues: result.error.issues }, 'plan list schema drifted');
}
```

`ResponseValidationError` extends `HttpError`, so it flows through the same
result. Narrow with `instanceof` when you want the issue paths; otherwise it
behaves like any other failure, with the code `ERR_RESPONSE_INVALID`.

Passing `schema` is the highest-value habit in this codebase. An API that
quietly renames a field fails at your boundary, naming the path, instead of
surfacing three screens later as `undefined`.

## Crossing into TanStack Query

Query wants a promise that rejects, so convert at the edge:

```ts
queryFn: ({ signal }) =>
  http.get(AppApis.invoice.list, { schema, signal }).then(unwrapForQuery),
```

`unwrapForQuery` throws the `HttpError`, which makes `error`, `isError`,
`retry`, and error boundaries behave the way the library documents. Do this
only inside `queryFn`; everywhere else, keep the result.

## Crossing into a Server Action

Actions never leak an exception to the browser. Anything thrown inside is
converted to `result.serverError`, a plain `ActionError`. Unknown errors are
replaced with a generic message, because an error's text can carry internals.

```ts
export const archiveInvoice = authActionClient
  .metadata({ name: 'invoice.archive' })
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await serverHttp.post(AppApis.invoice.archive(parsedInput.id));
    if (!result.ok) {
      if (result.error.isForbidden()) {
        returnServerError(actionError(ACTION_ERROR_CODE.FORBIDDEN, 'Not yours to archive.', 403));
      }
      throw result.error;                       // becomes a generic serverError
    }
    revalidateTag(`invoice:${parsedInput.id}`, 'max');
    return { archived: true };
  });
```

On the client:

```tsx
const { execute, isPending, result } = useAction(archiveInvoice);
// result.serverError?.message is safe to render; result.validationErrors is per field
```

`actionError(code, message, status)` builds the plain shape; the codes that
ship are `UNAUTHENTICATED`, `FORBIDDEN`, and `INTERNAL`, and you add your own
as string constants. Use `returnServerError` for failures the user should
see, `returnValidationErrors` for field-level problems, and a bare `throw`
for everything that is a bug.

## Boundaries

| Scope | Mechanism |
| :-- | :-- |
| One section of a page | `SectionErrorBoundary` from `@/components` |
| A whole route segment | `error.tsx` in that segment |
| The root, including the layout | `global-error.tsx` |
| A request that failed on the server | `onRequestError` in `src/instrumentation.ts` |

`SectionErrorBoundary` is built on `catchError` from `next/error`, so
`retry()` re-renders only that subtree while `redirect()` and `notFound()`
still pass through to the framework. It logs through the application logger
and never renders the raw message.

```tsx
<SectionErrorBoundary title={t('signIn.unavailable')} retryLabel={t('common.retry')}>
  <SignInOptions />
</SectionErrorBoundary>
```

It takes the heading to show in place of the section and the label for its
retry button, both of which you translate. It never takes the error's own
message.

**Never render `error.message` in production.** It can contain an upstream
URL, a stack, or a database hint. Show your own text, and put the detail in
the log where the request id ties it to everything else.
