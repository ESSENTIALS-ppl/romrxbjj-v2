// save-push-subscription v19 (FG-12 multi-device). STAGED ONLY: not deployed. Needs the FG-12 migration applied FIRST.
// Same contract as v18 ({subscription}) plus {unsubscribe:true, endpoint}. v19 stores EVERY device in push_subscriptions
// and still writes the legacy single-device column so the migration can be rolled back with nothing lost.
export interface Subscription { endpoint: string; keys: { p256dh: string; auth: string } }
export interface Deps {
  /** Verified user id from the caller's JWT, or null. */
  userId: (req: Request) => Promise<string | null>;
  /** Re-points an existing device row to this user and clears failures. Returns true if a row matched. */
  touch: (userId: string, s: Subscription) => Promise<boolean>;
  /** Inserts a new device. Returns "ok" | "limit" (10 live devices) | throws. */
  insert: (userId: string, s: Subscription) => Promise<"ok" | "limit">;
  remove: (userId: string, endpoint: string) => Promise<void>;
  legacy: (userId: string, s: Subscription) => Promise<void>;
  origins: (o: string | null) => Record<string, string>;
}
export function parseSubscription(v: unknown): Subscription | null {
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 2048) return null;
  const p = s.keys?.p256dh, a = s.keys?.auth;
  if (typeof p !== "string" || p.length < 20 || p.length > 200 || typeof a !== "string" || a.length < 8 || a.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh: p, auth: a } };
}
export async function handle(req: Request, d: Deps): Promise<Response> {
  const cors = d.origins(req.headers.get("Origin"));
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!req.headers.get("Authorization")) return json({ error: "Missing Authorization header" }, 401);
  const uid = await d.userId(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  let body: { subscription?: unknown; unsubscribe?: unknown; endpoint?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (body.unsubscribe === true) {
    if (typeof body.endpoint !== "string" || body.endpoint.length > 2048) return json({ error: "Missing endpoint" }, 400);
    try { await d.remove(uid, body.endpoint); } catch { return json({ error: "save_failed" }, 500); }
    return json({ success: true });
  }
  const s = parseSubscription(body.subscription);
  if (!s) return json({ error: "Missing or invalid subscription object" }, 400);
  try {
    if (!(await d.touch(uid, s))) { if ((await d.insert(uid, s)) === "limit") return json({ error: "device_limit_reached" }, 409); }
    await d.legacy(uid, s);
  } catch { return json({ error: "save_failed" }, 500); } // never echo database text
  return json({ success: true });
}
