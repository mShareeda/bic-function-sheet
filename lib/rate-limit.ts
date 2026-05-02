// In-memory sliding-window rate limiter.
//
// State is per-process — it resets on serverless cold starts. This still
// meaningfully throttles attacks within a warm instance. For fully distributed
// protection, replace the Map with a Vercel KV / Redis backend.

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

// Periodically prune stale entries to prevent unbounded Map growth.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now >= entry.resetAt) store.delete(key);
      }
    },
    5 * 60 * 1000, // every 5 minutes
  );
}
