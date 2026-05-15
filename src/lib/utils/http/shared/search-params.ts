/**
 * Build a `URLSearchParams` instance from a typed query object.
 *
 * Skips keys whose value is `undefined`, `null`, or an empty string so
 * defaults stay implicit (the backend's `BaseQueryDto` has its own defaults
 * — sending empty strings would override them). Coerces numbers/booleans
 * to strings, leaves strings untouched, and serialises arrays as repeated
 * keys (`?tag=a&tag=b`) — the encoding `qs.stringify` / NestJS' parser
 * round-trips natively.
 *
 * Use with a typed query interface so the call site reads as a single
 * structured object instead of a string-bag:
 *
 * ```ts
 * const result = await fetchClient.get<PaginatedApiResponse<User>>(
 *   `/users?${toSearchParams<UsersQuery>(query)}`,
 * );
 * ```
 */
export function toSearchParams<T extends Record<string, unknown>>(params: T): URLSearchParams {
  const out = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null || raw === '') continue;

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item === undefined || item === null || item === '') continue;
        out.append(key, String(item));
      }
      continue;
    }

    out.append(key, String(raw));
  }

  return out;
}
