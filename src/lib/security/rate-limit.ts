import 'server-only';

import { headers } from 'next/headers';

/**
 * Fixed-window rate limiting for the endpoints this application exposes.
 *
 * Route Handlers and Server Actions are public: anything that can reach the
 * site can call them. The session refresh route and the API proxy are the
 * two worth limiting here, because both cost an upstream request per call.
 *
 * The default store is a map in this process. That is honest for a single
 * instance and useless across several: each one keeps its own count, so the
 * effective limit multiplies by the number of instances. Pass a shared store
 * (Redis, Upstash, Cloudflare KV, or your own) in production, or put the
 * limit in front of the application entirely. `RateLimitStore` is two
 * methods so that swap stays small.
 */
export interface RateLimitHit {
  /** Requests seen in the current window, including this one. */
  count: number;
  /** Epoch milliseconds when the window ends. */
  resetAt: number;
}

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>;
  reset(key: string): Promise<void>;
}

/** Per-process store. Entries are dropped lazily once their window has passed. */
export const createMemoryStore = (): RateLimitStore => {
  const windows = new Map<string, RateLimitHit>();
  // Bounded so a flood of distinct keys cannot grow the map without limit.
  const MAX_KEYS = 10_000;

  const sweep = (now: number) => {
    for (const [key, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(key);
    }
  };

  return {
    async hit(key, windowMs) {
      const now = Date.now();
      const existing = windows.get(key);
      if (existing && existing.resetAt > now) {
        existing.count += 1;
        return { ...existing };
      }
      if (windows.size >= MAX_KEYS) sweep(now);
      const entry: RateLimitHit = { count: 1, resetAt: now + windowMs };
      windows.set(key, entry);
      return { ...entry };
    },
    async reset(key) {
      windows.delete(key);
    },
  };
};

const defaultStore = createMemoryStore();

export interface RateLimitOptions {
  /** What is being limited, plus who is asking: `refresh:203.0.113.4`. */
  key: string;
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  store?: RateLimitStore;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  /** Seconds to wait, for the `Retry-After` header. Zero while allowed. */
  retryAfter: number;
}

export const rateLimit = async ({
  key,
  limit,
  windowMs,
  store = defaultStore,
}: RateLimitOptions): Promise<RateLimitResult> => {
  const { count, resetAt } = await store.hit(key, windowMs);
  const ok = count <= limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: ok ? 0 : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
};

/** Standard headers, so a client can back off instead of guessing. */
export const rateLimitHeaders = (result: RateLimitResult): Record<string, string> => ({
  'RateLimit-Limit': String(result.limit),
  'RateLimit-Remaining': String(result.remaining),
  'RateLimit-Reset': String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
  ...(result.ok ? {} : { 'Retry-After': String(result.retryAfter) }),
});

const FORWARDED_FOR = 'x-forwarded-for';
const REAL_IP = 'x-real-ip';

/**
 * The caller's address, as reported by the proxy in front of this
 * application. Only meaningful when that proxy is one you control and it
 * overwrites these headers: a client can send them, so trusting them behind
 * nothing lets anyone pick their own bucket.
 */
export const callerKey = async (prefix: string): Promise<string> => {
  const headerList = await headers();
  const forwarded = headerList.get(FORWARDED_FOR)?.split(',')[0]?.trim();
  const address = forwarded || headerList.get(REAL_IP)?.trim() || 'unknown';
  return `${prefix}:${address}`;
};

/** 429 with the headers a well-behaved client needs. */
export const tooManyRequests = (result: RateLimitResult): Response =>
  Response.json(
    { message: 'Too many requests. Try again shortly.', code: 'ERR_RATE_LIMITED' },
    { status: 429, headers: rateLimitHeaders(result) },
  );
