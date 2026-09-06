# Observability

One structured logger, one request id, and one place where uncaught server
errors surface.

## Logging

```ts
import { logger } from '@/lib/logger';

logger.info({ invoiceId }, 'Invoice archived');
logger.warn({ err: result.error }, 'Sign-in capabilities unavailable');
```

`console.*` is banned by lint. It has no levels, no structure, no redaction,
and it disappears in production.

The first argument is the structured payload, the second the message. That
order is what makes logs queryable: `invoiceId` becomes a field you can
filter on, rather than text inside a sentence. Put the error under the `err`
key so pino serializes it with its stack and cause.

Levels: `error` for something that needs a human, `warn` for a degraded path
that recovered, `info` for lifecycle events, `debug` for detail that is off
in production. Development gets pretty-printed output; production emits JSON
for a log pipeline.

## Request ids

The proxy stamps `X-Request-Id` on every incoming request. The server HTTP
client forwards it upstream, so your API can log the same value.

To attach it to your own logs, use the request logger:

```ts
import { getRequestLogger } from '@/lib/logger/request';

const log = await getRequestLogger();
log.info({ invoiceId }, 'Archiving');   // includes requestId
```

It reads a request header, which makes the caller dynamic, so use it in
actions, Route Handlers, and dynamic components, and keep the plain `logger`
inside cached functions and the static shell. Minting an id inside a cached
scope would bake one request's id into a shared result, which is exactly the
kind of unstable value that fails a build.

## Uncaught server errors

`src/instrumentation.ts` receives every uncaught server error, from renders,
Route Handlers, Server Actions, and the proxy, along with the digest that the
error boundaries showed the user:

```ts
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { reportRequestError } = await import('@/lib/logger/request-error');
  reportRequestError(error, request, context);
};
```

The digest is the link between the two halves. A user reporting "it said
something went wrong, the code was 3f2a1b" gives you a value you can search
for in the logs.

`register()` runs once per server instance and is where a tracer or an error
tracker is initialized. Both hooks are Node-only, and their imports are
dynamic so an edge bundle never pulls in the logger.

## Adding a tracker or tracing

Neither ships here, because the right one depends on where you run. Wiring
either is small:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  await import('./otel');                 // or your tracker's init
  const { logger } = await import('@/lib/logger');
  logger.info({ runtime: process.env.NEXT_RUNTIME }, 'Server instance ready');
}
```

Send the error itself from `onRequestError`, where you already have the
request, the digest, and the context. Add the tracker's own origins to the
content security policy if it reports from the browser too.

## What is worth logging

| Log | Do not log |
| :-- | :-- |
| A mutation that succeeded, with the entity id | Whole request or response objects |
| A degraded path that fell back, with the reason | Anything under a redacted key, by hand |
| Lifecycle events: boot, shutdown, migrations | Per-render chatter on a hot path |
| Upstream failures with status and code | The user's own content |

Server Actions log themselves: the action client records the action name and
its duration, so a mutation is already traceable without adding a line.

## Checking it works

The end-to-end suite asserts that a response carries a well-formed request
id. In development, `pnpm dev` prints the pretty-printed stream; in a
container, `docker logs` shows the JSON your pipeline will parse. Confirm
before launch that the pipeline actually parses it, that redaction survives
the trip, and that a deliberate error reaches wherever you expect to see it.
