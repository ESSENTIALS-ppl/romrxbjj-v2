// ROMRx AI Chat — Sprint 8 rate-limit scaffold wrapper
// Delegates to handler.js (esbuild-minified main ai-chat logic). Limits TBD/tunable.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  DEFAULT_LIMITS,
  enforceRateLimit,
  checkRateLimit,
  rateLimitKey,
  clientIp,
  tooManyRequests,
} from "../_shared/rate_limit.ts";
import { handleRequest } from "./handler.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jwtRole(jwt: string): string {
  try {
    return JSON.parse(atob(jwt.split(".")[1]))?.role ?? "anon";
  } catch {
    return "anon";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // Hourly IP burst guard
  {
    const limited = enforceRateLimit(req, "ai-chat", { corsHeaders: CORS });
    if (limited) return limited;
  }

  // If authenticated, also apply user-keyed hourly + soft monthly caps
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (jwtRole(token) === "authenticated" && token) {
    // Soft identity from JWT payload sub (no network); fallback IP
    let userId: string | undefined;
    try {
      userId = JSON.parse(atob(token.split(".")[1]))?.sub;
    } catch { /* ignore */ }
    if (userId) {
      const hourly = enforceRateLimit(req, "ai-chat", {
        userId,
        corsHeaders: CORS,
      });
      if (hourly) return hourly;
      const monthlyKey = rateLimitKey("ai-chat-monthly", {
        userId,
        ip: clientIp(req),
      });
      const monthly = checkRateLimit(
        monthlyKey,
        DEFAULT_LIMITS["ai-chat-monthly"],
      );
      if (!monthly.allowed) return tooManyRequests(monthly, CORS);
    }
  }

  return handleRequest(req);
});
