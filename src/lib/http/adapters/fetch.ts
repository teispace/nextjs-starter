import type { Adapter } from '../types';

/** Native `fetch`. Works in the browser, Node 24, and the Edge runtime. */
export const fetchAdapter: Adapter = (request) =>
  fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: request.signal,
    credentials: request.credentials,
    cache: request.cache,
    next: request.next,
  });
