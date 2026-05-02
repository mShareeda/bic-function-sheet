// Sliding-window rate limiter.
//
// Uses Vercel KV (Upstash Redis) when KV_REST_API_URL is configured so limits
// survive serverless cold starts. Falls back to an in-memory Map otherwise
// (local dev or environments without KV provisioned).

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

// ---------- KV-backed implementation ----------

async function checkRateLimitKV(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const { kv } = await import("@vercel/kv");
  const now = Date.now();
  const windowSecs = Math.ceil(windowMs / 1000);
  const kvKey = `rl:${key}`;

  // Atomic increment + set TTL (only on first write) via pipeline
  const pipeline = kv.pipeline();
  pipeline.incr(kvKey);
  pipeline.expire(kvKey, windowSecs, "NX"); // set TTL only on first creation
  const [count] = (await pipeline.exec()) as [number, ...unknown[]];

  if (count > limit) {
    const ttl = await kv.pttl(kvKey);
    return { allowed: false, retryAfterMs: ttl > 0 ? ttl : windowMs };
  }

  return { allowed: true, remaining: limit - count };
}

// ---------- In-memory fallback ----------

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function checkRateLimitMemory(
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

// Prune stale in-memory entries periodically.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [k, entry] of store) {
        if (now >= entry.resetAt) store.delete(k);
      }
    },
    5 * 60 * 1000,
  );
}

// ---------- Public interface ----------

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (process.env.KV_REST_API_URL) {
    try {
      return await checkRateLimitKV(key, limit, windowMs);
    } catch {
      // KV unavailable — degrade gracefully to in-memory
    }
  }
  return checkRateLimitMemory(key, limit, windowMs);
}
