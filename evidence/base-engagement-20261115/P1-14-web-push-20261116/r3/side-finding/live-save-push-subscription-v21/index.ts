// save-push-subscription v19 entrypoint. STAGED ONLY. Uses SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (names; presence UNVERIFIED).
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
    const { data, error } = await admin.from("push_subscriptions").update({ user_id, p256dh: s.keys.p256dh, auth: s.keys.auth, failure_count: 0, disabled_at: null }).eq("endpoint", s.endpoint).select("id");
    if (error) throw new Error("touch failed");
    return (data ?? []).length > 0;
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
  origins: (o) => ({ "Access-Control-Allow-Origin": o && ALLOWED.has(o) ? o : "https://romrx.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" }),
}));
