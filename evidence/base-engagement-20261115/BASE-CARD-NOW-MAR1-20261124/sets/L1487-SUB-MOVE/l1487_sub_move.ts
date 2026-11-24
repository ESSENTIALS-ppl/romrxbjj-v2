// L1487-SUB-MOVE: move ONE live Stripe subscription's trial_end from 1798822800 (Jan 1, 2027 12:00 PM ET) to 1803920400
// (Mar 1, 2027 12:00 PM ET). STAGED, NOT RUN. Run only after: pin, Vera precheck, Sable release, and the D3 / webhook
// trial_end post-check (Grant 3:16 PM). Deadline: live and Vera post-checked by Mon Nov 30, 2026, 6:00 PM ET.
//
// Default = DRY RUN: one read-only GET, prints the before state and the checks. Nothing is written.
// --apply   : one POST subscriptions/{id} trial_end=1803920400 proration_behavior=none (fixed idempotency key), then GET after.
// --rollback: see l1487_rollback.ts (separate file).
//
// Key: env L1487_STRIPE_KEY = a LIVE Stripe secret key or a restricted key with Subscriptions write (rk_live_...).
// The key is read from the environment only. It is never printed, logged, written to a file or put in argv.
// No read-only Stripe key exists today (LIVE-TRACKER.md:391 PENDING), so even the dry run needs the key holder.
// Output carries no customer email, name or address: ids, statuses and timestamps only.
//
// Run: deno run --allow-net=api.stripe.com --allow-env=L1487_STRIPE_KEY --allow-write=. l1487_sub_move.ts [--apply]

export const SUB_ID = "sub_1UVa8YDou9Iktbw0s4QIPS7b"; // ONLY this subscription. The 2 test-mode subs are left alone.
export const OLD_TRIAL_END = 1798822800; // Fri Jan 1, 2027 12:00:00 PM EST
export const NEW_TRIAL_END = 1803920400; // Mon Mar 1, 2027 12:00:00 PM EST
export const IDEMPOTENCY_KEY = "L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400";
export const EXCLUDED_USER_PREFIXES = ["7c71e421", "076ce453"]; // never touched

// deno-lint-ignore no-explicit-any
type Sub = Record<string, any>;

/** Skip flags. Any non-empty result aborts: no write. */
export function skipFlags(s: Sub, mode: "apply" | "after"): string[] {
  const f: string[] = [];
  if (s.id !== SUB_ID) f.push(`wrong_id:${s.id}`);
  if (s.object !== "subscription") f.push("not_a_subscription");
  if (s.livemode !== true) f.push("not_livemode");
  if (s.status !== "trialing") f.push(`status_not_trialing:${s.status}`);
  const want = mode === "apply" ? OLD_TRIAL_END : NEW_TRIAL_END;
  if (s.trial_end !== want) f.push(`trial_end_not_${want}:${s.trial_end}`);
  if (s.cancel_at_period_end) f.push("cancel_at_period_end");
  if (s.cancel_at) f.push(`cancel_at:${s.cancel_at}`);
  if (s.canceled_at) f.push(`canceled_at:${s.canceled_at}`);
  if (s.ended_at) f.push(`ended_at:${s.ended_at}`);
  if (s.schedule) f.push("has_subscription_schedule");
  if (s.pause_collection) f.push("pause_collection");
  if (!s.default_payment_method && mode === "apply") f.push("no_default_payment_method(check customer invoice_settings; Vera decides)");
  const uid = String(s.metadata?.user_id ?? "");
  if (EXCLUDED_USER_PREFIXES.some((p) => uid.startsWith(p))) f.push("excluded_user");
  if (uid && !uid.startsWith("21647e5a")) f.push(`metadata_user_not_21647e5a:${uid.slice(0, 8)}`);
  return f;
}

/** Warnings: printed for Vera, do not abort (the sub may predate today's metadata shape). */
export function warnings(s: Sub): string[] {
  const w: string[] = [];
  if (!s.metadata?.user_id) w.push("metadata.user_id_missing");
  if ((s.metadata?.purpose ?? "") !== "base") w.push(`metadata.purpose:${s.metadata?.purpose ?? "none"}`);
  const items = s.items?.data ?? [];
  if (items.length !== 1) w.push(`items:${items.length}`);
  if (items[0]?.price?.unit_amount !== 6000) w.push(`item_amount:${items[0]?.price?.unit_amount}`);
  return w;
}

/** stripe-webhook v59 :688 only syncs users.base_expiry when sub metadata has purpose "base" and a user_id. */
export function webhookWillSync(s: Sub): boolean {
  const m = s.metadata ?? {};
  return String(m.purpose ?? "").toLowerCase() === "base" && !!(m.user_id ?? m.supabase_user_id);
}

/** Safe summary for printing (no customer PII; the customer id is cut). */
export function summary(s: Sub) {
  const et = (u: number | null) => u ? new Date(u * 1000).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET" : null;
  return { id: s.id, livemode: s.livemode, status: s.status, trial_end: s.trial_end, trial_end_et: et(s.trial_end),
    current_period_end: s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null, cancel_at_period_end: s.cancel_at_period_end,
    cancel_at: s.cancel_at, schedule: s.schedule ? "present" : null, default_payment_method: s.default_payment_method ? "present" : null,
    customer8: String(s.customer ?? "").slice(0, 8), metadata_user8: String(s.metadata?.user_id ?? "").slice(0, 8), latest_invoice: s.latest_invoice ? "present" : null };
}

export async function stripe(method: "GET" | "POST", path: string, key: string, body?: URLSearchParams, idem?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idem) headers["Idempotency-Key"] = idem;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
  const json = await r.json();
  return { ok: r.ok, status: r.status, date: r.headers.get("date"), requestId: r.headers.get("request-id"), json };
}

if (import.meta.main) {
  const apply = Deno.args.includes("--apply");
  const key = Deno.env.get("L1487_STRIPE_KEY") ?? "";
  if (!/^(sk|rk)_live_/.test(key)) { console.error("L1487_STRIPE_KEY missing or not a live key (value not shown). Abort."); Deno.exit(2); }
  const now = Math.floor(Date.now() / 1000);
  if (now >= OLD_TRIAL_END - 48 * 3600) { console.error("Past Dec 30, 2026 12:00 PM ET: the old trial is under 48 h; abort (re-plan)."); Deno.exit(2); }
  const before = await stripe("GET", `subscriptions/${SUB_ID}`, key);
  if (!before.ok) { console.error("GET before failed", before.status, before.json?.error?.code); Deno.exit(1); }
  console.log("BEFORE", JSON.stringify(summary(before.json)));
  if (before.json.trial_end === NEW_TRIAL_END && before.json.status === "trialing") {
    console.log("ALREADY MOVED (trial_end 1803920400). No write. Idempotent no-op."); Deno.exit(0);
  }
  const flags = skipFlags(before.json, "apply");
  console.log("SKIP_FLAGS", JSON.stringify(flags));
  console.log("WARNINGS", JSON.stringify(warnings(before.json)));
  console.log("WEBHOOK_SYNC", webhookWillSync(before.json) ? "yes: v59 customer.subscription.updated will set users.base_expiry (no SQL needed)"
    : "NO: sub metadata lacks purpose=base + user_id; after --apply run 4-fallback-base-expiry.sql (pinned, Vera)");
  if (flags.length) { console.error("ABORT: skip flags set. No write."); Deno.exit(3); }
  if (!apply) { console.log(`DRY RUN ONLY. Would POST subscriptions/${SUB_ID} trial_end=${NEW_TRIAL_END} proration_behavior=none Idempotency-Key ${IDEMPOTENCY_KEY}`); Deno.exit(0); }

  const upd = await stripe("POST", `subscriptions/${SUB_ID}`, key,
    new URLSearchParams({ trial_end: String(NEW_TRIAL_END), proration_behavior: "none" }), IDEMPOTENCY_KEY);
  console.log("UPDATE", upd.status, "stripe_date", upd.date, "request_id", upd.requestId);
  if (!upd.ok) { console.error("UPDATE FAILED", upd.json?.error?.code, upd.json?.error?.message); Deno.exit(1); }
  const after = await stripe("GET", `subscriptions/${SUB_ID}`, key);
  console.log("AFTER", JSON.stringify(summary(after.json)));
  const af = skipFlags(after.json, "after").filter((x) => !x.startsWith("no_default_payment_method"));
  console.log("AFTER_CHECK", af.length ? `FAIL ${JSON.stringify(af)}` : "OK trialing, trial_end 1803920400");
  // Real Stripe update time (no backdating): the HTTP Date header of the update response (Stripe server time).
  const changedAt = new Date(upd.date ?? Date.now()).toISOString();
  const rec = { stripe_subscription_id: SUB_ID, old_trial_end: OLD_TRIAL_END, new_trial_end: NEW_TRIAL_END, stripe_changed_at: changedAt,
    stripe_request_id: upd.requestId, idempotency_key: IDEMPOTENCY_KEY };
  Deno.writeTextFileSync("L1487-APPLY-RECORD.json", JSON.stringify(rec, null, 1) + "\n");
  console.log("WROTE L1487-APPLY-RECORD.json (feeds 3-amendment-insert.sql; no secrets, no PII)");
  if (af.length) Deno.exit(4);
}
