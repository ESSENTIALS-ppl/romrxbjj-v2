// send-push-notification (P1-14). Re-introduced after the 2026-10-01 410 stub.
// BRANCH ONLY, not deployed. verify_jwt must be false (pg_cron, no user JWT).
// Fail-closed x-cron-secret via public.verify_webhook_secret (cron_webhook_secret), same as other cron senders.
// Sends only when WEB_PUSH_SEND is exactly "on". Never logs VAPID values, endpoints, or emails.
// r3: 404/410 clears that user's dead push_subscriptions row and any matching legacy
// notification_preferences.push_subscription jsonb, and releases the push_sends claim.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, type Candidate, type Deps, type Kind, type PushSub, dedupeKey, vapidSubjectOk } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  if (!SUPABASE_URL || !SERVICE) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch {
    return false;
  }
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
}

function localDateAndHour(now: Date, tz: string | null): { date: string; hour: number } {
  const zone = tz && tz.length <= 64 ? tz : "America/New_York";
  let date = "";
  let hour = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    date = `${g("year")}-${g("month")}-${g("day")}`;
    hour = parseInt(g("hour") || "0", 10);
  } catch {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    date = `${g("year")}-${g("month")}-${g("day")}`;
    hour = parseInt(g("hour") || "0", 10);
  }
  return { date, hour };
}

function reminderHour(t: string | null | undefined): number | null {
  if (!t) return 9;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?/.exec(t);
  if (!m) return 9;
  const h = parseInt(m[1], 10);
  return h >= 0 && h <= 23 ? h : 9;
}

function subFromJson(raw: unknown): PushSub | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof o.endpoint !== "string" || !o.endpoint.startsWith("https://")) return null;
  const p256dh = o.keys && typeof o.keys.p256dh === "string" ? o.keys.p256dh : "";
  const auth = o.keys && typeof o.keys.auth === "string" ? o.keys.auth : "";
  if (p256dh.length < 20 || auth.length < 8) return null;
  return { endpoint: o.endpoint, p256dh, auth };
}

// r2 is_test: same live flag as rombot-checkin v1 (public.is_test_account(p_email), SECURITY DEFINER, service_role
// EXECUTE). No user id is special-cased here. Any read error or missing email counts as test (fail closed, no push).
// Emails are read only to call the RPC; they are never logged or returned.
async function testFlags(sb: ReturnType<typeof admin>, ids: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (!ids.length) return out;
  const { data: users, error } = await sb.from("users").select("id, email").in("id", ids);
  if (error || !users) return out;
  for (const u of users as { id: string; email: string | null }[]) {
    if (!u.email) { out.set(u.id, true); continue; }
    try {
      const { data, error: e } = await sb.rpc("is_test_account", { p_email: u.email });
      out.set(u.id, e ? true : data !== false);
    } catch {
      out.set(u.id, true);
    }
  }
  return out;
}

async function listDue(kinds: Kind[], now: Date): Promise<Candidate[]> {
  const sb = admin();
  const out: Candidate[] = [];
  const seen = new Set<string>();

  if (kinds.includes("protocol") || kinds.includes("retest")) {
    const { data: prefs, error } = await sb.from("notification_preferences").select("user_id, timezone, reminder_time, push_reminders, push_subscription").eq("push_reminders", true);
    if (error || !prefs) return out;

    const ids = prefs.map((p: { user_id: string }) => p.user_id);
    const { data: tableSubs } = ids.length
      ? await sb.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", ids).is("disabled_at", null)
      : { data: [] as { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] };

    const { data: schedules } = kinds.includes("retest") && ids.length
      ? await sb.from("user_mobility_schedule").select("user_id, next_retest_at").in("user_id", ids)
      : { data: [] as { user_id: string; next_retest_at: string | null }[] };
    const retestByUser = new Map((schedules ?? []).map((s: { user_id: string; next_retest_at: string | null }) => [s.user_id, s.next_retest_at]));

    const subsByUser = new Map<string, { id: string | null; sub: PushSub }[]>();
    for (const row of tableSubs ?? []) {
      const sub: PushSub = { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth };
      const list = subsByUser.get(row.user_id) ?? [];
      list.push({ id: row.id, sub });
      subsByUser.set(row.user_id, list);
    }
    for (const p of prefs as { user_id: string; timezone: string | null; reminder_time: string | null; push_subscription: unknown }[]) {
      if (!subsByUser.has(p.user_id)) {
        const fallback = subFromJson(p.push_subscription);
        if (fallback) subsByUser.set(p.user_id, [{ id: null, sub: fallback }]);
      }
    }

    const flags = await testFlags(sb, [...subsByUser.keys()]);

    for (const p of prefs as { user_id: string; timezone: string | null; reminder_time: string | null }[]) {
      const subs = subsByUser.get(p.user_id) ?? [];
      const isTest = flags.get(p.user_id) ?? true;
      if (!subs.length) continue;
      const local = localDateAndHour(now, p.timezone);
      if (kinds.includes("protocol") && reminderHour(p.reminder_time) === local.hour) {
        for (const s of subs) {
          const k = `protocol:${p.user_id}:${s.sub.endpoint}`;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({ userId: p.user_id, subscriptionId: s.id, kind: "protocol", dedupeKey: dedupeKey("protocol", local.date), localDate: local.date, sub: s.sub, timezone: p.timezone, isTest });
        }
      }
      if (kinds.includes("retest")) {
        const iso = retestByUser.get(p.user_id);
        if (iso) {
          const retestLocal = localDateAndHour(new Date(iso), p.timezone);
          if (retestLocal.date === local.date) {
            for (const s of subs) {
              const k = `retest:${p.user_id}:${s.sub.endpoint}`;
              if (seen.has(k)) continue;
              seen.add(k);
              out.push({ userId: p.user_id, subscriptionId: s.id, kind: "retest", dedupeKey: dedupeKey("retest", local.date), localDate: local.date, sub: s.sub, timezone: p.timezone, isTest });
            }
          }
        }
      }
    }
  }
  return out;
}

async function claim(userId: string, dedupeKeyValue: string): Promise<boolean> {
  const { error } = await admin().from("push_sends").insert({ user_id: userId, dedupe_key: dedupeKeyValue });
  if (!error) return true;
  if (String(error.message || "").toLowerCase().includes("duplicate") || (error as { code?: string }).code === "23505") return false;
  return false;
}

async function markSuccess(subscriptionId: string | null): Promise<void> {
  if (!subscriptionId) return;
  await admin().from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failure_count: 0 }).eq("id", subscriptionId);
}

async function markFailure(subscriptionId: string | null, gone: boolean): Promise<void> {
  if (!subscriptionId) return;
  const patch: Record<string, unknown> = { last_failure_at: new Date().toISOString() };
  // r3: 404/410 is handled by clearDead (row delete / jsonb null), not disabled_at.
  if (gone) patch.disabled_at = new Date().toISOString();
  await admin().from("push_subscriptions").update(patch).eq("id", subscriptionId);
}

// r3: clear only this user's dead subscription. Table row is deleted by id+user_id.
// The legacy jsonb column is nulled only when its stored endpoint matches, for this user only.
// When a table row is cleared, a matching jsonb fallback is also nulled so listDue cannot
// resurrect the same dead endpoint on the next run.
async function clearDead(userId: string, subscriptionId: string | null, endpoint: string): Promise<void> {
  const sb = admin();
  if (subscriptionId) {
    await sb.from("push_subscriptions").delete().eq("id", subscriptionId).eq("user_id", userId);
  }
  const { data } = await sb.from("notification_preferences").select("push_subscription").eq("user_id", userId).maybeSingle();
  const stored = subFromJson((data as { push_subscription?: unknown } | null)?.push_subscription);
  if (stored && stored.endpoint === endpoint) {
    await sb.from("notification_preferences").update({ push_subscription: null }).eq("user_id", userId);
  }
}

async function releaseClaim(userId: string, dedupeKeyValue: string): Promise<void> {
  await admin().from("push_sends").delete().eq("user_id", userId).eq("dedupe_key", dedupeKeyValue);
}

async function liveSend(sub: PushSub, payload: string): Promise<{ ok: boolean; gone?: boolean }> {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const priv = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "";
  if (!pub || !priv || !vapidSubjectOk(subject)) return { ok: false };
  try {
    const webpush = (await import("npm:web-push@3.6.7")).default;
    webpush.setVapidDetails(subject, pub, priv);
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}

Deno.serve((req) =>
  handle(req, {
    cronCallerOk,
    webPushSend: Deno.env.get("WEB_PUSH_SEND"),
    vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY"),
    vapidPrivateKey: Deno.env.get("VAPID_PRIVATE_KEY"),
    vapidSubject: Deno.env.get("VAPID_SUBJECT"),
    now: () => new Date(),
    listDue,
    claim,
    send: liveSend,
    markSuccess,
    markFailure,
    clearDead,
    releaseClaim,
  } satisfies Deps),
);
