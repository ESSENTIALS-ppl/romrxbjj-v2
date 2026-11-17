// save-push-subscription r3 (P1-14). BUILD ONLY, not deployed.
// Built from live source (list/get this turn: version 21, ezbr 5d123c2b; r2 receipt called the same
// hash v20; comments in that source still say v19). Same contract as live: {subscription} plus
// {unsubscribe:true, endpoint}. Still writes the legacy notification_preferences.push_subscription
// jsonb column. r3 fix: an endpoint match updates only the caller's own rows. A cross-user
// endpoint is deleted from the previous owner and inserted fresh for the caller — never a silent
// reassign of user_id on the existing row.
// W2 (fix/p1-14-w2-device-move-backup-20261116): after a successful save, clear this exact endpoint
// from every OTHER user's legacy notification_preferences.push_subscription backup, so a device that
// moved from user A to user B can no longer be reached through A's backup.

export interface Subscription { endpoint: string; keys: { p256dh: string; auth: string } }
export type Takeover = "taken" | "none" | "limit";
export interface Deps {
  /** Verified user id from the caller's JWT, or null. */
  userId: (req: Request) => Promise<string | null>;
  /** Update keys on the caller's own row for this endpoint. Never changes user_id. Returns true if a row matched. */
  touch: (userId: string, s: Subscription) => Promise<boolean>;
  /** If another user owns this endpoint, delete that row and insert a fresh row for the caller. Never updates user_id in place. */
  takeover: (userId: string, s: Subscription) => Promise<Takeover>;
  /** Inserts a new device. Returns "ok" | "limit" (10 live devices) | throws. */
  insert: (userId: string, s: Subscription) => Promise<"ok" | "limit">;
  remove: (userId: string, endpoint: string) => Promise<void>;
  legacy: (userId: string, s: Subscription) => Promise<void>;
  /** W2: null the legacy backup on every OTHER user whose backup holds this exact endpoint. Never touches the caller's own backup. Throws on error. */
  clearOtherBackups: (userId: string, endpoint: string) => Promise<void>;
  origins: (o: string | null) => Record<string, string>;
}

export function parseSubscription(v: unknown): Subscription | null {
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 2048) return null;
  const p = s.keys?.p256dh, a = s.keys?.auth;
  if (typeof p !== "string" || p.length < 20 || p.length > 200 || typeof a !== "string" || a.length < 8 || a.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh: p, auth: a } };
}

/** Own-row update, or delete+insert for a cross-user endpoint, or a plain insert. Never reassigns user_id. */
export async function saveDevice(userId: string, s: Subscription, d: Pick<Deps, "touch" | "takeover" | "insert">): Promise<"ok" | "limit"> {
  if (await d.touch(userId, s)) return "ok";
  const t = await d.takeover(userId, s);
  if (t === "taken") return "ok";
  if (t === "limit") return "limit";
  return await d.insert(userId, s);
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
    if ((await saveDevice(uid, s, d)) === "limit") return json({ error: "device_limit_reached" }, 409);
    await d.clearOtherBackups(uid, s.endpoint);
    await d.legacy(uid, s);
  } catch { return json({ error: "save_failed" }, 500); } // never echo database text
  return json({ success: true });
}
