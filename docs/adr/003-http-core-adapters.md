# 003. One HTTP core with pluggable adapters

**Status**: accepted (v2)

**Decision**: a single `HttpClient` implements URL composition, headers, request ids, cookie forwarding, body preparation, retries, timeouts, cancellation, refresh-and-replay, envelope unwrapping, and schema validation. The network call is an `Adapter` (`(request) => Promise<Response>`). `fetchAdapter` is the default; `axiosAdapter` wraps an Axios instance and is only bundled when imported. Every call returns `Result<T, HttpError>`.

**Alternatives**: two parallel clients sharing helpers (1.x); a single fetch-only client with no Axios option.

**Why**: the 1.x clients had drifted (different retry, refresh, and error behaviour). With one core, one test suite runs against both adapters and behaviour cannot diverge. Axios stays available because next-maker offers it and some teams depend on its interceptor ecosystem, but it costs nothing when unused. Plain `Result` objects, not `Either` classes, because results cross the Server Component and Server Action boundaries and sit in Redux state, all of which require serialisable values.
