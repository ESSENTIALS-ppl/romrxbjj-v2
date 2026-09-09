/**
 * Sprint 8 rate-limit scaffold (beta ~300 readiness).
 *
 * Approach: in-memory sliding/fixed window counters keyed by
 *   `${edgeName}:${userId|ip}`
 *
 * Caveats (documented intentionally for follow-up):
 * - In-memory is per Deno isolate / edge instance — not globally consistent.
 *   Fine for scaffold + burst abuse; for hard caps across instances use a
 *   Supabase table (e.g. rate_limit_buckets) or Redis later.
 * - Limits below are TBD / tunable placeholders — not production-final.
 * - Env overrides: RATE_LIMIT_DISABLED=true bypasses checks (local/dev).
 *
 * Suggested defaults (tune before world invite):
 * | Edge                    | Key          | Limit | Window   | Why                          |
 * |-------------------------|--------------|-------|----------|------------------------------|
 * | ai-chat                 | user|ip      | 60    | 1 hour   | Cost / OpenAI abuse          |
 * | ai-chat (monthly soft)  | user         | 1000  | 30 days  | Fall plan ~$0.40/user memo   |
 * | submit-assessment       | user         | 20    | 1 hour   | Spam assessments             |
 * | submit-lead-assessment  | ip           | 10    | 1 hour   | Public lead spam (TODO wire) |
 * | create-checkout-session | user|ip      | 15    | 1 hour   | Checkout spam                |
 * | notify-coach-signup     | ip           | 10    | 1 hour   | Signup email spam            |
 * | set-password / auth*    | ip|user      | 10    | 1 hour   | Auth abuse (not in this repo)|
 *
 * *Auth-related edges (set-password, admin-reset-password, etc.) live in
 *  deployed Supabase but are not present under supabase/functions/ on main
 *  in this repo — wire when those sources are checked in.
 */

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
  key: string;
};

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Documented placeholder limits — override per call or via env later. */
export const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "ai-chat": { limit: 60, windowMs: 60 * 60 * 1000 },
  "ai-chat-monthly": { limit: 1000, windowMs: 30 * 24 * 60 * 60 * 1000 },
  "submit-assessment": { limit: 20, windowMs: 60 * 60 * 1000 },
  "submit-lead-assessment": { limit: 10, windowMs: 60 * 60 * 1000 },
  "create-checkout-session": { limit: 15, windowMs: 60 * 60 * 1000 },
  "notify-coach-signup": { limit: 10, windowMs: 60 * 60 * 1000 },
  "set-password": { limit: 10, windowMs: 60 * 60 * 1000 },
  default: { limit: 30, windowMs: 60 * 60 * 1000 },
};

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim() || "unknown";
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimitKey(
  edgeName: string,
  identity: { userId?: string | null; ip?: string | null },
): string {
  const id = identity.userId?.trim() || identity.ip?.trim() || "anon";
  return `${edgeName}:${id}`;
}

/**
 * Fixed-window counter. Returns whether the request may proceed.
 * Fail-open if RATE_LIMIT_DISABLED=true.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  if ((Deno.env.get("RATE_LIMIT_DISABLED") ?? "").toLowerCase() === "true") {
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
      key,
    };
  }

  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    store.set(key, bucket);
  }

  if (bucket.count >= config.limit) {
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      key,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
    key,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  );
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { "Retry-After": String(retryAfterSec) }),
  };
}

/** Build a standard 429 JSON Response for edge handlers. */
export function tooManyRequests(
  result: RateLimitResult,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      limit: result.limit,
      reset_at: new Date(result.resetAt).toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(result),
        ...extraHeaders,
      },
    },
  );
}

/**
 * Convenience: resolve config for an edge, check, return null if OK else 429.
 */
export function enforceRateLimit(
  req: Request,
  edgeName: string,
  opts: {
    userId?: string | null;
    config?: RateLimitConfig;
    corsHeaders?: Record<string, string>;
  } = {},
): Response | null {
  const config = opts.config ?? DEFAULT_LIMITS[edgeName] ?? DEFAULT_LIMITS.default!;
  const key = rateLimitKey(edgeName, {
    userId: opts.userId,
    ip: clientIp(req),
  });
  const result = checkRateLimit(key, config);
  if (result.allowed) return null;
  return tooManyRequests(result, opts.corsHeaders ?? {});
}
