// DRAFT Base pre-renewal CRON sender: window, target match, skips, dedupe with the webhook claim. No network.
//   deno test --allow-env --allow-read --allow-write --import-map=supabase/functions/_tests/import_map.json supabase/functions/_tests/
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { DEFAULT_TARGET_DATE, TARGET_TRIAL_END_UNIX, etDate, runPrerenewalCron, sendWindow, trialEndMatches, type CronDeps } from "../_shared/prerenewal_cron.ts";
import { PREREMINDER_EMAIL_ID } from "../_shared/prerenewal_copy.ts";

const at = (m: number, d: number, h = 15) => Date.UTC(2026, m - 1, d, h, 0); // 15:00 UTC = 10:00 ET in December

Deno.test("window: closed before Dec 18, open Dec 18-28 (ET), closed after; target must sit in Dec 11-28", () => {
  assertEquals(sendWindow("2026-12-17"), { open: false, reason: "before_target_date" });
  assertEquals(sendWindow("2026-12-18"), { open: true });
  assertEquals(sendWindow("2026-12-28"), { open: true });
  assertEquals(sendWindow("2026-12-29"), { open: false, reason: "after_window" });
  assertEquals(sendWindow("2026-12-18", "2026-12-10"), { open: false, reason: "target_outside_window" });
  assertEquals(sendWindow("2026-12-18", "2026-12-29"), { open: false, reason: "target_outside_window" });
  assertEquals(sendWindow("2026-12-12", "2026-12-11"), { open: true });
  assertEquals(DEFAULT_TARGET_DATE, "2026-12-18");
  assertEquals(etDate(Date.UTC(2026, 11, 19, 3, 0)), "2026-12-18"); // 10pm ET Dec 18 is still Dec 18
});

Deno.test("target match: Jan 1 2027 12:00 ET trial_end only", () => {
  assert(trialEndMatches(TARGET_TRIAL_END_UNIX));
  assert(!trialEndMatches(TARGET_TRIAL_END_UNIX + 3 * 86400));
  assert(!trialEndMatches(Date.UTC(2026, 11, 20) / 1000));
});

// ---- fake Supabase + fetch ----
interface U { id: string; email: string; [k: string]: unknown }
function mkUser(id: string, over: Record<string, unknown> = {}): U {
  return { id, email: `u${id}@example.com`, full_name: "Test", base_status: "active", base_stripe_subscription_id: `sub_${id}`,
    base_cancel_at_period_end: false, base_cancel_at: null, base_canceled_at: null, ...over };
}
function mkEnv(users: U[], subs: Record<string, Record<string, unknown>>, opts: { testEmails?: string[]; sentBefore?: string[]; resendOk?: boolean } = {}) {
  const claims = new Set<string>((opts.sentBefore ?? []).map((id) => `${id}:${PREREMINDER_EMAIL_ID}`));
  const mails: { to: string; subject: string; html: string; text: string; key: string }[] = [];
  const events: string[] = [];
  let stripeCalls = 0;
  const supabase = {
    rpc: async (_fn: string, a: { p_email: string }) => ({ data: (opts.testEmails ?? []).includes(a.p_email), error: null }),
    from: (t: string) => {
      const f: Record<string, unknown> = {};
      const chain = {
        select: () => chain, eq: (c: string, v: string) => { f[c] = v; return chain; }, not: () => chain, limit: () => Promise.resolve({ data: users, error: null }),
        maybeSingle: () => Promise.resolve({ data: claims.has(`${f.user_id}:${f.email_id}`) ? { user_id: f.user_id } : null, error: null }),
        insert: (row: { user_id: string; email_id: string }) => {
          const k = `${row.user_id}:${row.email_id}`;
          if (claims.has(k)) return Promise.resolve({ error: { message: "duplicate" } });
          claims.add(k); return Promise.resolve({ error: null });
        },
        delete: () => ({ eq: (c1: string, v1: string) => ({ eq: (_c2: string, v2: string) => { claims.delete(`${v1}:${v2}`); return Promise.resolve({ error: null }); } }) }),
      };
      void t;
      return chain;
    },
  };
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith("https://api.stripe.com/v1/subscriptions/")) {
      stripeCalls++;
      const id = decodeURIComponent(u.split("/").pop()!);
      return subs[id] ? new Response(JSON.stringify(subs[id]), { status: 200 }) : new Response("{}", { status: 404 });
    }
    if (u.includes("api.resend.com")) {
      const b = JSON.parse(String(init?.body));
      const h = init?.headers as Record<string, string>;
      if (opts.resendOk === false) return new Response("{}", { status: 500 });
      mails.push({ to: b.to[0], subject: b.subject, html: b.html, text: b.text, key: h["Idempotency-Key"] });
      return new Response(JSON.stringify({ id: "re_stub" }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as typeof fetch;
  const deps = (over: Partial<CronDeps> = {}): CronDeps => ({
    supabase, fetchImpl, nowMs: at(12, 18), enabled: true, resendKey: "stub", stripeKey: "stub",
    from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io",
    logEvent: async (e) => { events.push(e); }, ...over,
  });
  return { deps, mails, events, claims, stripeCalls: () => stripeCalls };
}
const sub = (id: string, over: Record<string, unknown> = {}) => ({
  id: `sub_${id}`, status: "trialing", trial_end: TARGET_TRIAL_END_UNIX, created: Math.floor(Date.UTC(2026, 9, 5) / 1000),
  metadata: { purpose: "base", user_id: id }, items: { data: [{ price: { unit_amount: 6000 } }] }, ...over,
});

Deno.test("flag off: nothing queried, nothing sent", async () => {
  const env = mkEnv([mkUser("1")], { sub_1: sub("1") });
  const r = await runPrerenewalCron(env.deps({ enabled: false }));
  assertEquals(r.window, "flag_off"); assertEquals(r.sent, 0); assertEquals(env.mails.length, 0); assertEquals(env.stripeCalls(), 0);
});

Deno.test("outside the window: nothing sent even when enabled", async () => {
  const env = mkEnv([mkUser("1")], { sub_1: sub("1") });
  for (const nowMs of [at(12, 17), at(12, 29), at(10, 3)]) {
    const r = await runPrerenewalCron(env.deps({ nowMs }));
    assertEquals(r.sent, 0); assertEquals(env.mails.length, 0); assert(r.window !== "open");
  }
});

Deno.test("Dec 18: sends once to an eligible Base user with the #76 copy and the shared claim; second run is a no-op", async () => {
  const env = mkEnv([mkUser("1")], { sub_1: sub("1") });
  const r = await runPrerenewalCron(env.deps());
  assertEquals(r.sent, 1);
  assertEquals(env.mails.length, 1);
  assertStringIncludes(env.mails[0].subject, "Your ROMRx plan renews on January 1, 2027");
  assertStringIncludes(env.mails[0].subject, "[DRAFT]");
  assertStringIncludes(env.mails[0].html, "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
  assertStringIncludes(env.mails[0].html, "$60");
  assert(env.claims.has(`1:${PREREMINDER_EMAIL_ID}`), "uses the same email_sends claim as the webhook handler");
  assertEquals(env.mails[0].key, `${PREREMINDER_EMAIL_ID}-1`);
  assertEquals(env.events.length, 1);
  const again = await runPrerenewalCron(env.deps({ nowMs: at(12, 19) }));
  assertEquals(again.sent, 0); assertEquals(again.skipped.already_sent, 1); assertEquals(env.mails.length, 1);
});

Deno.test("never both: a user already claimed by the stripe-webhook handler is skipped (and vice versa the claim blocks the webhook)", async () => {
  const env = mkEnv([mkUser("1")], { sub_1: sub("1") }, { sentBefore: ["1"] });
  const r = await runPrerenewalCron(env.deps());
  assertEquals(r.sent, 0); assertEquals(r.skipped.already_sent, 1); assertEquals(env.stripeCalls(), 0);
});

Deno.test("skips: fixtures, non-Base, canceled, cancel scheduled (DB and Stripe), wrong trial end, brand-new signups", async () => {
  const users = [
    mkUser("t"), mkUser("sp"), mkUser("c1", { base_cancel_at_period_end: true }), mkUser("c2", { base_canceled_at: "2026-12-01T00:00:00Z" }),
    mkUser("c3"), mkUser("c4"), mkUser("w"), mkUser("n"), mkUser("ok"),
  ];
  const subs = {
    sub_t: sub("t"), sub_sp: sub("sp", { metadata: { purpose: "sport_unlock", user_id: "sp" } }),
    sub_c3: sub("c3", { status: "canceled" }), sub_c4: sub("c4", { cancel_at_period_end: true }),
    sub_w: sub("w", { trial_end: TARGET_TRIAL_END_UNIX + 20 * 86400 }),
    sub_n: sub("n", { created: Math.floor(at(12, 18) / 1000) - 3600 }),
    sub_ok: sub("ok"),
  };
  const env = mkEnv(users, subs, { testEmails: ["ut@example.com"] });
  const r = await runPrerenewalCron(env.deps());
  assertEquals(r.sent, 1);
  assertEquals(env.mails.map((m) => m.to), ["uok@example.com"]);
  assertEquals(r.skipped.test_fixture, 1);
  assertEquals(r.skipped.not_base, 1);
  assertEquals(r.skipped.cancel_scheduled_or_canceled, 3);
  assertEquals(r.skipped.status_canceled, 1);
  assertEquals(r.skipped.trial_end_not_target, 1);
  assertEquals(r.skipped.created_under_24h_ack_just_sent, 1);
});

Deno.test("dry run: counts would-send, claims nothing, sends nothing", async () => {
  const env = mkEnv([mkUser("1")], { sub_1: sub("1") });
  const r = await runPrerenewalCron(env.deps({ dryRun: true }));
  assertEquals(r.wouldSend, 1); assertEquals(r.sent, 0); assertEquals(env.mails.length, 0); assertEquals(env.claims.size, 0);
});

Deno.test("Resend failure releases the claim so a later day can retry; catch-up on Dec 20 works", async () => {
  const bad = mkEnv([mkUser("1")], { sub_1: sub("1") }, { resendOk: false });
  const r = await runPrerenewalCron(bad.deps());
  assertEquals(r.sent, 0); assertEquals(bad.claims.size, 0); assertEquals(r.skipped.resend_error, 1);
  const good = mkEnv([mkUser("1")], { sub_1: sub("1") });
  const r2 = await runPrerenewalCron(good.deps({ nowMs: at(12, 20) }));
  assertEquals(r2.sent, 1);
});
