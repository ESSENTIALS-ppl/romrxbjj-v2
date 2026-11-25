// save-push-subscription r3 entrypoint. BUILD ONLY, not deployed.
// Uses SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (names; presence UNVERIFIED).
// r3: touch matches only the caller's own rows and never writes user_id. A cross-user endpoint
// is deleted from the previous owner and inserted as a new row for the caller.
// W2: clearOtherBackups nulls this exact endpoint from other users' legacy backups (service role).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, type Subscription } from "./handler.ts";

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const ALLOWED = new Set(["https://romrx.io", "https://www.romrx.io", "https://app.romrx.io", "https://romrxbjj.com", "https://www.romrxbjj.com", "https://romrxbodybuilding.com", "https://www.romrxbodybuilding.com"]); // same seven hostnames as FG-38

Deno.serve((req) => handle(req, {
  userId: async (r) => {
    const c = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: r.headers.get("Authorization") ?? "" } } });
    const { data: { user }, error } = await c.auth.getUser();
    return error || !user ? null : user.id;
  },
  touch: async (user_id, s: Subscription) => {
    // Match only this caller's rows. Do not set user_id (that would silently reassign a cross-user row).
    const { data, error } = await admin.from("push_subscriptions").update({ p256dh: s.keys.p256dh, auth: s.keys.auth, failure_count: 0, disabled_at: null }).eq("endpoint", s.endpoint).eq("user_id", user_id).select("id");
    if (error) throw new Error("touch failed");
    return (data ?? []).length > 0;
  },
  takeover: async (user_id, s: Subscription) => {
    const { data: other, error: findErr } = await admin.from("push_subscriptions").select("id, user_id").eq("endpoint", s.endpoint).neq("user_id", user_id).maybeSingle();
    if (findErr) throw new Error("takeover lookup failed");
    if (!other) return "none";
    // Do not delete the other user's row if the caller is already at the 10-device cap.
    const { count, error: countErr } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user_id).is("disabled_at", null);
    if (countErr) throw new Error("takeover count failed");
    if ((count ?? 0) >= 10) return "limit";
    const { error: delErr } = await admin.from("push_subscriptions").delete().eq("id", (other as { id: string }).id).eq("endpoint", s.endpoint).neq("user_id", user_id);
    if (delErr) throw new Error("takeover delete failed");
    const { error: insErr } = await admin.from("push_subscriptions").insert({ user_id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
    if (!insErr) return "taken";
    if (insErr.code === "23514") return "limit";
    throw new Error("takeover insert failed");
  },
  insert: async (user_id, s) => {
    const { error } = await admin.from("push_subscriptions").insert({ user_id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
    if (!error) return "ok";
    if (error.code === "23514") return "limit";
    throw new Error("insert failed");
  },
  remove: async (user_id, endpoint) => { const { error } = await admin.from("push_subscriptions").delete().eq("user_id", user_id).eq("endpoint", endpoint); if (error) throw new Error("remove failed"); },
  legacy: async (user_id, s) => {
    const { error } = await admin.from("notification_preferences").upsert({ user_id, push_subscription: s, push_reminders: true }, { onConflict: "user_id" });
    if (error) throw new Error("legacy failed");
  },
  clearOtherBackups: async (user_id, endpoint) => {
    // W2: service role, scoped to this exact endpoint and to users other than the caller.
    const { error } = await admin.from("notification_preferences").update({ push_subscription: null }).eq("push_subscription->>endpoint", endpoint).neq("user_id", user_id);
    if (error) throw new Error("backup clear failed");
  },
  origins: (o) => ({ "Access-Control-Allow-Origin": o && ALLOWED.has(o) ? o : "https://romrx.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" }),
}));
