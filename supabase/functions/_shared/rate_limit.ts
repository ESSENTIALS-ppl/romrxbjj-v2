/**
 * Sprint 8 rate-limit (table-backed, cross-isolate).
 *
 * Approach: Postgres `rate_limit_buckets` + atomic `rate_limit_hit` RPC
 * keyed by `${edgeName}:${userId|ip}`. Survives Deno isolate churn so Field
 * can observe real 429 + Retry-After under burst.
 *
 * Behavior:
 * - RATE_LIMIT_DISABLED=true → fail-open (local/dev bypass)
 * - RPC / DB error → fail-open + console.error (do not break ROMBot on
 *   transient DB blips; Grant Field PASS depends on RPC working — keep table
 *   + grants healthy)
 * - Denied → tooManyRequests with Retry-After + X-RateLimit-*
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
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

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

let _admin: SupabaseClient | null = null;

function serviceClient(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("[rate_limit] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

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
 * Table-backed fixed-window counter via rate_limit_hit RPC.
 * Fail-open if RATE_LIMIT_DISABLED=true or on DB/RPC error.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if ((Deno.env.get("RATE_LIMIT_DISABLED") ?? "").toLowerCase() === "true") {
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
      key,
    };
  }

  const admin = serviceClient();
  if (!admin) {
    console.error("[rate_limit] fail-open: no service client", { key });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
      key,
    };
  }

  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: config.limit,
      p_window_ms: config.windowMs,
    });

    if (error) {
      console.error("[rate_limit] RPC error — fail-open", { key, error });
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetAt: Date.now() + config.windowMs,
        key,
      };
    }

    const row = data as {
      allowed?: boolean;
      limit?: number;
      remaining?: number;
      reset_at?: number;
    } | null;

    if (!row || typeof row.allowed !== "boolean") {
      console.error("[rate_limit] unexpected RPC payload — fail-open", { key, data });
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetAt: Date.now() + config.windowMs,
        key,
      };
    }

    return {
      allowed: row.allowed,
      limit: typeof row.limit === "number" ? row.limit : config.limit,
      remaining: typeof row.remaining === "number" ? row.remaining : 0,
      resetAt:
        typeof row.reset_at === "number"
          ? row.reset_at
          : Date.now() + config.windowMs,
      key,
    };
  } catch (err) {
    console.error("[rate_limit] exception — fail-open", { key, err });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
      key,
    };
  }
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
export async function enforceRateLimit(
  req: Request,
  edgeName: string,
  opts: {
    userId?: string | null;
    config?: RateLimitConfig;
    corsHeaders?: Record<string, string>;
  } = {},
): Promise<Response | null> {
  const config = opts.config ?? DEFAULT_LIMITS[edgeName] ?? DEFAULT_LIMITS.default!;
  const key = rateLimitKey(edgeName, {
    userId: opts.userId,
    ip: clientIp(req),
  });
  const result = await checkRateLimit(key, config);
  if (result.allowed) return null;
  return tooManyRequests(result, opts.corsHeaders ?? {});
}
