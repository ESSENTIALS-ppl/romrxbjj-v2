// P1-12 calendar-ics handler. JWT required. RLS user client. BRANCH ONLY, not deployed.
import { buildIcs } from "./ics.ts";

export interface Pref { reminder_time: string | null; timezone: string | null }
export interface Schedule { next_check_at: string | null; next_retest_at: string | null }
export interface Deps {
  userId: (req: Request) => Promise<string | null>;
  pref: (userId: string) => Promise<Pref | null>;
  schedule: (userId: string) => Promise<Schedule | null>;
  now: () => Date;
  origins: (o: string | null) => Record<string, string>;
}

export const ALLOWED_ORIGINS = new Set(["https://romrx.io", "https://www.romrx.io"]);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://romrx.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

export async function handle(req: Request, d: Deps): Promise<Response> {
  const cors = d.origins(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  if (!req.headers.get("Authorization")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const uid = await d.userId(req);
  if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const pref = await d.pref(uid);
  let schedule: Schedule | null = null;
  try { schedule = await d.schedule(uid); } catch { schedule = null; }
  const body = buildIcs({
    timezone: pref?.timezone ?? null,
    reminder_time: pref?.reminder_time ?? null,
    next_check_at: schedule?.next_check_at ?? null,
    next_retest_at: schedule?.next_retest_at ?? null,
    now: d.now(),
  });
  return new Response(body, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="romrx-base.ics"',
      "Cache-Control": "no-store",
    },
  });
}
