// keyfix-20261028 (staged, NOT deployed): Stripe API key name fix + webhook secret trim + verify diagnostics + cancel failure logging and alert (same Resend path as the Base PAID alert).
// 2026-10-22 (fix/webhook-arl-always-1022, HELD): ARL_LIVE_ENABLED gate removed. Every completed checkout (live or test)
//   writes billing_consents and sends the 3c / 3c-2 acknowledgment; the old v41 live emails are gone.
// v43: signature verification uses constructEventAsync (Deno/SubtleCrypto is async-only) + failure diagnostics (no secrets logged).
// v42 = v40 ARL work + release gate (ARL_LIVE_ENABLED): live-signed events behave exactly like v41 until it is "true".
// v40 (CA auto-renewal law fix, Legal plan ca-arl-plan-20260929 sections 3c + 4A.4 + 4C, Jim GO via Grant 2026-09-29):
//   - Base and Base + sport checkout.session.completed: the "You didn't buy a subscription" email is replaced by
//     Stacy's 3c acknowledgment ("Your ROMRx subscription: terms and how to cancel"). Prices come from the
//     session's arl_amounts metadata (read from Stripe at checkout) or, for older sessions, the subscription items.
//     Sent through Resend with an Idempotency-Key per Checkout Session; the Resend id is logged to product_events.
//   - Every checkout.session.completed (base, combo, sport unlock) writes one public.billing_consents row with the
//     Stripe consent result and the exact disclosure + consent text snapshot from the Session (no IP stored).
//   - Sport unlock checkout.session.completed: the old "Your {sport} pack is unlocked" email is replaced by Stacy's
//     3c-2 ("Your {Sport pack} is unlocked: terms and how to cancel"), incl. the [VERIFY] line
//     "Canceling {Sport pack} does not cancel your Base plan." (sport unlock = its own Stripe subscription).
//   - Jim 2026-09-29 (decision c): cancel = access ends IMMEDIATELY, no future charges, no refunds, free period
//     included. Base access is revoked on customer.subscription.deleted and on any Base update with status canceled.
//     A Base update that only schedules a cancel (cancel_at_period_end / cancel_at) is converted to an immediate
//     Stripe cancel (prorate=false, invoice_now=false) and access is revoked right away. Separate pack subs cancel too.
//   - cancel_at / canceled_at are still stored for records on users (base_*) and sport_entitlements, in a separate
//     update so a missing column can never block the base_status update.
//   - Fixture-only TEST mode: events signed with STRIPE_TEST_WEBHOOK_SECRET (livemode=false) are processed only for
//     users where public.is_test_account(email) is true, use STRIPE_TEST_SECRET_KEY for Stripe calls, and skip Jim's
//     internal PAID alerts. Live events are verified and handled exactly as before.
// v38 (ROMRx Base audit 2026-09-15)
//   - Stripe statuses are mapped to the users.base_status enum (trialing->active, incomplete->inactive,
//     unpaid/incomplete_expired->canceled, paused->past_due) instead of written raw, which violated the check
//     constraint and silently left Base users in their old state.
//   - invoice.payment_failed / invoice.payment_succeeded now also move base_status (past_due / active) when the
//     invoice belongs to the Base subscription.
//   - checkout.session.completed reads current_period_end from the Subscription (it is not on the Session).
//   - product_events logged for checkout_completed, base_status_changed is captured by the DB trigger.
// v37 Base cancel cascades to sport packs (Jim GO 2026-09-08, policy wins over Option 3)
// v36 dual-unlock pending_sport grant — Stripe constructEvent with STRIPE_WEBHOOK_SECRET
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { logEvent } from "../_shared/events.ts";
import {
  ARL_ACK_VERSION, SPORT_PACK_NAMES, formatUsd, ackSubject, ackHtml, ackText,
  ackSportSubject, ackSportHtml, ackSportText,
} from "../_shared/arl_copy.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// keyfix-20261028: read STRIPE_SECRET_KEY first (the name that exists), then legacy lowercase. || not ??, so an empty value falls through.
const STRIPE_SECRET_FOR_CANCEL = (Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("stripe_secret_key") || "").trim();
const JIM_EMAIL = "jim@romrx.io";
const FREEZE_DAYS = 90;

interface Brand { name: string; from: string; replyTo: string; login: string; dashboard: string; accent: string; }
const BRANDS: Record<string, Brand> = {
  bjj: {
    name: "ROMRxBJJ",
    from: "Jim Scott <jim@romrxbjj.com>",
    replyTo: "jim@romrxbjj.com",
    login: "https://romrxbjj.com/login",
    dashboard: "https://romrxbjj.com/dashboard/my-body",
    accent: "#c8102e",
  },
  bodybuilding: {
    name: "ROMRxBodybuilding",
    from: "Jim Scott <jim@romrxbodybuilding.com>",
    replyTo: "jim@romrxbodybuilding.com",
    login: "https://romrxbodybuilding.com/login",
    dashboard: "https://romrxbodybuilding.com/dashboard/my-body",
    accent: "#1e6fd9",
  },
};
function brandFor(sport?: string | null): Brand {
  return sport === "bodybuilding" ? BRANDS.bodybuilding : BRANDS.bjj;
}

const BRAND_HQ: Brand = {
  name: "ROMRx",
  from: "ROMRx <hello@romrx.io>",
  replyTo: "hello@romrx.io",
  login: "https://romrx.io/app/login",
  dashboard: "https://romrx.io/app/dashboard",
  accent: "#0047AB",
};

async function sendEmail(brand: Brand, to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: brand.from, to: [to], subject, html, reply_to: brand.replyTo }),
  });
}

// v40: which Stripe key to use for API calls for the event being handled (live unless a verified test event).
let CURRENT_CANCEL_KEY = STRIPE_SECRET_FOR_CANCEL;
let CURRENT_EVENT_IS_TEST = false; // keyfix-20261028: true only for a verified test-mode event (alerts stay quiet)

// Jim 2026-09-29 (decision c): cancel = immediate, no future charges, no refunds (no proration, no final invoice).
async function cancelStripeSub(subId: string) {
  if (!subId) return;
  if (!CURRENT_CANCEL_KEY) { await cancelFailAlert(subId, "no_key", null); return; }
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}?prorate=false&invoice_now=false`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CURRENT_CANCEL_KEY}` },
    });
    if (!r.ok) {
      const code = ((await r.json().catch(() => ({}))) as { error?: { code?: string } })?.error?.code ?? null;
      await cancelFailAlert(subId, String(r.status), code);
    }
  } catch (e) { await cancelFailAlert(subId, "fetch_error", null); console.error("cancelStripeSub threw", subId, String(e)); }
}
// keyfix-20261028: cancel failure alert, same Resend path as the "New Base PAID" alert. Live events only (test fixtures stay quiet).
// Sends ids, HTTP status and the Stripe error code only: no Stripe message text, no customer email. Never throws.
// Sunday file adds idempotency: at most one email per sub id per 24 h.
async function cancelFailAlert(subId: string, status: string, code: string | null) {
  console.error("cancelStripeSub failed", subId, status, code);
  if (CURRENT_EVENT_IS_TEST) return;
  try {
    // keyfix-20261028 (Sunday file only): one alert per sub id per 24 h, via the existing public.rate_limit_hit RPC.
    // Fails open: if the RPC errors or throws, the alert is sent anyway.
    try {
      const { data, error } = await createClient(SUPABASE_URL, SUPABASE_SVC)
        // deno-lint-ignore no-explicit-any
        .rpc("rate_limit_hit", { p_key: `cancel_alert:${subId}`, p_limit: 1, p_window_ms: 24 * 60 * 60 * 1000 } as any);
      if (error) console.error("cancel alert dedupe rpc failed (alerting anyway)", error.message);
      else if ((data as { allowed?: boolean } | null)?.allowed === false) return;
    } catch (e) { console.error("cancel alert dedupe threw (alerting anyway)", String(e)); }
    await sendEmail(BRAND_HQ, JIM_EMAIL, `ALERT: Stripe cancel FAILED ${subId}`,
      `<p>The webhook could not cancel a Stripe subscription. Access may already be revoked in ROMRx while Stripe could still bill.</p>
       <p><strong>Subscription:</strong> ${subId}<br><strong>HTTP status:</strong> ${status}<br><strong>Stripe error code:</strong> ${code ?? "none"}</p>
       <p>Check it in the Stripe dashboard and cancel by hand if it is still active.</p>`);
  } catch (e) { console.error("cancel failure alert not sent", String(e)); }
}

/** v40: 3c / 3c-2 acknowledgment via Resend. Returns the Resend id (or null). Idempotent per Checkout Session. */
async function sendArlAck(to: string, sessionId: string, basePrice: string, sportPack: string | null, sportPrice: string | null): Promise<string | null> {
  return await sendArlMail(to, `arl_ack-${sessionId}`, ackSubject(), ackHtml(basePrice, sportPack, sportPrice), ackText(basePrice, sportPack, sportPrice), "arl_ack");
}
async function sendArlSportAck(to: string, sessionId: string, sportPrice: string, sportPack: string, freePeriod: boolean): Promise<string | null> {
  // packCancelsAlone = true: a sport unlock is its own Stripe subscription and can be canceled without Base.
  return await sendArlMail(to, `arl_ack_sport-${sessionId}`, ackSportSubject(sportPack),
    ackSportHtml(sportPrice, sportPack, freePeriod, true), ackSportText(sportPrice, sportPack, freePeriod, true), "arl_ack_sport");
}
/** Strip anything that looks like an email address before logging provider text. */
function redactEmail(m: string | null | undefined): string {
  return (m ?? "").replace(/[^\s@]+@[^\s@]+/g, "[email]");
}
async function sendArlMail(to: string, key: string, subject: string, html: string, text: string, emailId: string): Promise<string | null> {
  if (!RESEND_KEY) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({
      from: BRAND_HQ.from, to: [to], reply_to: BRAND_HQ.replyTo,
      subject, html, text,
      headers: { "X-Entity-Ref-ID": key },
      tags: [{ name: "email_id", value: emailId }, { name: "type", value: "transactional" }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String((data as { message?: unknown })?.message ?? "");
    console.error("ARL ack Resend error", { status: res.status, message: redactEmail(msg) });
    return null;
  }
  return (data as { id?: string }).id ?? null;
}

/** v40: cancel state from a Stripe Subscription object. */
function cancelState(o: Record<string, unknown>, deleted: boolean) {
  const iso = (v: unknown) => (typeof v === "number" && v > 0 ? new Date(v * 1000).toISOString() : null);
  const cape = o.cancel_at_period_end === true;
  const cancelAt = iso(o.cancel_at) ?? (cape ? iso(o.current_period_end) : null);
  return {
    cancel_at_period_end: deleted ? false : cape,
    cancel_at: deleted ? (iso(o.ended_at) ?? iso(o.canceled_at)) : cancelAt,
    canceled_at: iso(o.canceled_at) ?? (deleted ? new Date().toISOString() : null),
  };
}
async function recordBaseCancelState(supabase: ReturnType<typeof createClient>, userId: string, st: ReturnType<typeof cancelState>) {
  const { error } = await supabase.from("users").update({
    base_cancel_at_period_end: st.cancel_at_period_end, base_cancel_at: st.cancel_at, base_canceled_at: st.canceled_at,
  }).eq("id", userId);
  if (error) console.error("base cancel state update failed", error.message);
}
async function recordSportCancelState(supabase: ReturnType<typeof createClient>, userId: string, sport: string, st: ReturnType<typeof cancelState>) {
  try {
    const { error } = await supabase.from("sport_entitlements").update({
      cancel_at_period_end: st.cancel_at_period_end, cancel_at: st.cancel_at, canceled_at: st.canceled_at,
    }).eq("user_id", userId).eq("sport", sport);
    if (error) console.error("sport cancel state update failed", error.message);
  } catch (e) { console.error("sport cancel state error", (e as Error)?.message); }
}
/** v40: Base scheduled to cancel (or resumed) -> schedule (or un-schedule) the user's SEPARATE sport-pack subscriptions. */

/** v40: yearly unit amounts (cents) in line-item order: from arl_amounts metadata, else from the subscription items. */
async function arlAmounts(stripe: Stripe, meta: Record<string, string>, subId: string | undefined): Promise<number[]> {
  const fromMeta = (meta.arl_amounts ?? "").split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
  if (fromMeta.length) return fromMeta;
  if (!subId) return [];
  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    return sub.items.data.map((i: Stripe.SubscriptionItem) => i.price.unit_amount ?? 0);
  } catch (e) {
    console.error("arlAmounts: subscriptions.retrieve failed", String(e));
    return [];
  }
}

/** D3 (2026-11-24): the consent row's trial_end is the Stripe subscription's own trial_end, never a literal.
 *  NULL when the subscription has no trial (paid at sign-up) or the retrieve fails. */
function trialEndIsoFromSub(sub: unknown): string | null {
  const t = ((sub ?? {}) as Record<string, unknown>).trial_end;
  return typeof t === "number" && Number.isFinite(t) && t > 0 ? new Date(t * 1000).toISOString() : null;
}
async function subTrialEndIso(stripe: Stripe, subId: string | undefined): Promise<string | null> {
  if (!subId) return null;
  try {
    return trialEndIsoFromSub(await stripe.subscriptions.retrieve(subId));
  } catch (e) {
    console.error("subTrialEndIso: subscriptions.retrieve failed", String(e));
    return null;
  }
}

/** v40: one consent record per Checkout Session (spec 4C). Service role only; never stores IP. */
async function writeBillingConsent(supabase: ReturnType<typeof createClient>, obj: Record<string, unknown>, meta: Record<string, string>, userId: string, livemode: boolean, amounts: number[], trialEndIso: string | null) {
  const customText = (obj.custom_text ?? {}) as Record<string, { message?: string } | null>;
  const consent = (obj.consent ?? {}) as Record<string, string | null>;
  const consentCollection = (obj.consent_collection ?? {}) as Record<string, string | null>;
  const tos = consent.terms_of_service ?? null;
  const offer = meta.arl_offer || ((meta.purpose ?? "") === "sport_unlock" ? "sport" : (meta.pending_sport ? "combo" : "base"));
  const created = typeof obj.created === "number" ? obj.created as number : null;
  const row = {
    user_id: userId,
    stripe_checkout_session_id: obj.id as string,
    stripe_subscription_id: (obj.subscription as string | undefined) ?? null,
    stripe_customer_id: (obj.customer as string | undefined) ?? null,
    offer,
    price_ids: (meta.arl_price_ids ?? "").split(",").filter(Boolean),
    amounts,
    currency: (obj.currency as string | undefined) ?? "usd",
    interval: "year",
    trial_end: trialEndIso,
    disclosure_text_version: meta.arl_version ?? "none (pre-ARL session)",
    disclosure_text: customText.submit?.message ?? null,
    consent_text: customText.terms_of_service_acceptance?.message ?? null,
    consent_method: consentCollection.terms_of_service === "required" ? "stripe_terms_of_service" : "none",
    stripe_consent_terms_of_service: tos,
    consented_at: tos === "accepted" ? new Date().toISOString() : null,
    checkout_created_at: created ? new Date(created * 1000).toISOString() : null,
    user_agent: meta.arl_ua || null,
    region_state: null,
    livemode,
  };
  const { error } = await supabase.from("billing_consents").upsert(row, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true });
  if (error) console.error("billing_consents insert failed", error.message);
}

type Sb = ReturnType<typeof createClient>;

/** Jim lock 2026-09-08: Base cancel → all sport packs cancel (DB + access + separate Stripe sport subs). */
async function cancelAllSportPacksForUser(
  supabase: Sb,
  userId: string,
  opts?: { alsoCancelStripe?: boolean; skipSubId?: string | null },
) {
  const { data: rows } = await supabase
    .from("sport_entitlements")
    .select("sport, stripe_subscription_id, status")
    .eq("user_id", userId);

  for (const row of rows ?? []) {
    if (row.status === "canceled") continue;
    await supabase.from("sport_entitlements").update({ status: "canceled" })
      .eq("user_id", userId).eq("sport", row.sport);
    await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: row.sport });
    const sportSub = row.stripe_subscription_id as string | null;
    if (
      opts?.alsoCancelStripe &&
      sportSub &&
      sportSub !== opts.skipSubId
    ) {
      await cancelStripeSub(sportSub);
    }
  }
}

function isBaseHardCancel(status: string): boolean {
  return status === "canceled" || status === "unpaid" || status === "incomplete_expired";
}

/** Stripe subscription status -> users.base_status enum (inactive|active|past_due|canceled). */
function toBaseStatus(stripeStatus: string): "inactive" | "active" | "past_due" | "canceled" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "paused":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default: // incomplete and anything new
      return "inactive";
  }
}

/** Stripe subscription status -> sport_entitlements.status (free text today; keep Stripe vocabulary but never undefined). */
function toEntitlementStatus(stripeStatus: string): string {
  return stripeStatus === "trialing" ? "active" : (stripeStatus || "inactive");
}

/** guard-20261028: period end for a Subscription-shaped object. Order: top-level current_period_end, then
 *  items.data[0].current_period_end (API 2026-01-28.clover and later moved it to the items), then trial_end.
 *  Returns an ISO string, or null if none is a positive number. Never throws. */
function subPeriodEndIso(o: unknown): string | null {
  const s = (o ?? {}) as Record<string, unknown>;
  const items = s.items as { data?: Array<Record<string, unknown>> } | undefined;
  const cands: unknown[] = [s.current_period_end, items?.data?.[0]?.current_period_end, s.trial_end];
  for (const c of cands) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return new Date(c * 1000).toISOString();
  }
  return null;
}

async function periodEndFromSubscription(stripe: Stripe, subId: string | undefined | null): Promise<string | null> {
  if (!subId) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    return subPeriodEndIso(sub);
  } catch (e) {
    console.error("subscriptions.retrieve failed", subId, String(e));
    return null;
  }
}

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET  = (Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("stripe_secret_key") || "").trim();
const STRIPE_WEBHOOK_SECRET = (Deno.env.get("STRIPE_WEBHOOK_SECRET") || Deno.env.get("stripe_webhook_secret") || "").trim(); // keyfix-20261028: trim stray whitespace from a pasted value
// v40 fixture-only test mode. Both must be set for test events to be accepted.
const STRIPE_TEST_WEBHOOK_SECRET = (Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") ?? "").trim();
const STRIPE_TEST_SECRET = (Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "").trim();
const TEST_MODE_READY = STRIPE_TEST_WEBHOOK_SECRET.startsWith("whsec_") && STRIPE_TEST_SECRET.startsWith("sk_test_");

/** P1-22: atomic first-delivery claim for a Stripe checkout session id.
 *  INSERT ... ON CONFLICT (stripe_checkout_session_id) DO NOTHING RETURNING via
 *  upsert(ignoreDuplicates) + select(); the PRIMARY KEY on
 *  public.stripe_checkout_claims (migration 20261116040200) makes it atomic, so two
 *  concurrent Stripe deliveries of the same session cannot both get "first".
 *  "first"  = this call inserted the row (returned row checked).
 *  "repeat" = the row already existed (0 rows returned, no error).
 *  "unknown"= no session id, or the claim errored (e.g. table not there yet):
 *             fail open, i.e. behave exactly like v53 (alert + event).
 *  Gates only the Jim PAID alert and the checkout_completed event; entitlement
 *  writes always run. DEPLOY HOLD: stripe-webhook deploy needs Jim's own yes.
 *  Does not touch create-checkout-session. */
async function claimCheckoutSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string | null,
  purpose: string,
  userId: string | null,
  livemode: boolean | null,
): Promise<"first" | "repeat" | "unknown"> {
  if (!sessionId) return "unknown";
  try {
    const { data, error } = await supabase
      .from("stripe_checkout_claims")
      .upsert(
        { stripe_checkout_session_id: sessionId, purpose, user_id: userId, livemode },
        { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true },
      )
      .select("stripe_checkout_session_id");
    if (error) {
      console.error("checkout claim failed; failing open", sessionId, error.message);
      return "unknown";
    }
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 1 && rows[0]?.stripe_checkout_session_id === sessionId) return "first";
    if (rows.length === 0) return "repeat";
    console.error("checkout claim returned unexpected rows; failing open", sessionId, rows.length);
    return "unknown";
  } catch (e) {
    console.error("checkout claim threw; failing open", sessionId, String(e));
    return "unknown";
  }
}

/** v40: user id an event refers to (metadata first, then customer id lookup). */
async function eventUserEmail(supabase: ReturnType<typeof createClient>, obj: Record<string, unknown>): Promise<string | null> {
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const uid = meta.user_id ?? meta.supabase_user_id ?? null;
  if (uid) {
    const { data } = await supabase.from("users").select("email").eq("id", uid).maybeSingle();
    if (data?.email) return data.email as string;
  }
  const cust = typeof obj.customer === "string" ? obj.customer : null;
  if (cust) {
    const { data } = await supabase.from("users").select("email").eq("stripe_customer_id", cust).maybeSingle();
    if (data?.email) return data.email as string;
  }
  const details = obj.customer_details as Record<string, string> | undefined;
  return details?.email ?? null;
}

Deno.serve(async (req: Request) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let stripe = new Stripe(STRIPE_SECRET || "sk_unused", { apiVersion: "2024-11-20.acacia" });
  CURRENT_CANCEL_KEY = STRIPE_SECRET_FOR_CANCEL;
  CURRENT_EVENT_IS_TEST = false;

  let event: Stripe.Event;
  let testEvent = false;
  try {
    // constructEventAsync: same accept/reject result as constructEvent, but works with Deno's async SubtleCrypto.
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (liveErr) {
    if (!TEST_MODE_READY) {
      // Diagnostics only (no secret values): which prerequisite is missing.
      console.error("webhook verify failed; test mode not ready", JSON.stringify({
        whsec_set: STRIPE_TEST_WEBHOOK_SECRET.length > 0, whsec_prefix_ok: STRIPE_TEST_WEBHOOK_SECRET.startsWith("whsec_"),
        sk_prefix_ok: STRIPE_TEST_SECRET.startsWith("sk_test_"), live_whsec_len: STRIPE_WEBHOOK_SECRET.length, live_err: String((liveErr as Error)?.message ?? liveErr).slice(0, 80),
      }));
      return new Response("Invalid signature", { status: 400 });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_TEST_WEBHOOK_SECRET);
      if (event.livemode !== false) return new Response("Invalid signature", { status: 400 });
      testEvent = true;
    } catch (testErr) {
      console.error("webhook verify failed (live and test)", JSON.stringify({
        whsec_len: STRIPE_TEST_WEBHOOK_SECRET.length, live_whsec_len: STRIPE_WEBHOOK_SECRET.length,
        live_err: String((liveErr as Error)?.message ?? liveErr).slice(0, 120), test_err: String((testErr as Error)?.message ?? testErr).slice(0, 120),
      }));
      return new Response("Invalid signature", { status: 400 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC);
  const type = event.type as string;
  const obj  = event.data.object as Record<string, unknown>;

  // v40: test-mode events only ever touch test fixtures, and use the test key for Stripe calls.
  if (testEvent) {
    const who = await eventUserEmail(supabase, obj);
    const { data: isTest } = who ? await supabase.rpc("is_test_account", { p_email: who }) : { data: false };
    if (isTest !== true) {
      console.warn("test-mode event ignored: not a test fixture", type);
      return new Response(JSON.stringify({ received: true, ignored: "not_test_fixture" }), { headers: { "Content-Type": "application/json" } });
    }
    stripe = new Stripe(STRIPE_TEST_SECRET, { apiVersion: "2024-11-20.acacia" });
    CURRENT_CANCEL_KEY = STRIPE_TEST_SECRET;
    CURRENT_EVENT_IS_TEST = true;
  }
  const alertJim = !testEvent; // no internal PAID alerts for fixture test events
  // 2026-10-22: ARL behavior is always on for live and test events (no ARL_LIVE_ENABLED gate).
  const arlOn = true;

  if (type === "checkout.session.completed") {
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const customerId = obj.customer as string;
    const email      = ((obj.customer_details as Record<string, string>)?.email ?? "").toLowerCase();
    const subId      = obj.subscription as string | undefined;
    // v38: current_period_end lives on the Subscription, not the Checkout Session.
    const realPeriodEnd = await periodEndFromSubscription(stripe, subId);
    const expiry     = realPeriodEnd
      ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const purpose = (meta.purpose ?? "").toLowerCase();

    if (purpose === "base" && meta.user_id) {
      // guard-20261028: never write NULL, and never let the 365-day fallback overwrite an existing future expiry.
      const basePatch: Record<string, unknown> = {
        stripe_customer_id: customerId,
        base_status: "active",
        base_stripe_subscription_id: subId ?? null,
      };
      if (realPeriodEnd) {
        basePatch.base_expiry = realPeriodEnd;
      } else {
        const { data: curExp } = await supabase.from("users").select("base_expiry").eq("id", meta.user_id).maybeSingle();
        const curMs = curExp?.base_expiry ? Date.parse(String(curExp.base_expiry)) : NaN;
        if (Number.isFinite(curMs) && curMs > Date.now()) {
          console.warn("guard: no period end on checkout.session.completed; kept existing future base_expiry", meta.user_id);
        } else {
          basePatch.base_expiry = expiry; // new buyer, or expired/NULL row: the 365-day fallback is allowed here only
          console.warn("guard: no period end on checkout.session.completed; used 365-day fallback (no existing future expiry)", meta.user_id);
        }
      }
      await supabase.from("users").update(basePatch).eq("id", meta.user_id);

      const { data: baseUser } = await supabase.from("users").select("full_name").eq("id", meta.user_id).maybeSingle();
      const baseName = baseUser?.full_name ?? (email ? email.split("@")[0] : "there");
      const firstName = String(baseName).split(" ")[0] || "there";

      const pendingSport = (meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding")
        ? meta.pending_sport
        : null;

      // v40: consent record + 3c acknowledgment (replaces "You didn't buy a subscription...").
      const amounts = arlOn ? await arlAmounts(stripe, meta, subId) : [];
      if (arlOn) await writeBillingConsent(supabase, obj, meta, meta.user_id, !testEvent, amounts, await subTrialEndIso(stripe, subId));
      if (arlOn && email && amounts.length) {
        const sportPack = pendingSport && amounts.length > 1 ? SPORT_PACK_NAMES[pendingSport] : null;
        const sportPrice = sportPack ? formatUsd(amounts[1]) : null;
        const resendId = await sendArlAck(email, obj.id as string, formatUsd(amounts[0]), sportPack, sportPrice);
        await logEvent("email_sent", { userId: meta.user_id, sport: pendingSport ?? "general", source: "stripe",
          props: { email_id: "arl_ack", template_version: ARL_ACK_VERSION, resend_id: resendId, checkout_session: obj.id, testmode: testEvent } });
      } else if (arlOn && email) {
        console.error("ARL ack not sent: no price amounts for session", obj.id);
        await logEvent("arl_ack_skipped_amounts_unavailable", { userId: meta.user_id, sport: pendingSport ?? "general", source: "stripe",
          props: { email_id: "arl_ack", checkout_session: obj.id, testmode: testEvent } });
      }

      // P1-22: claim this checkout session right before the PAID alert. The alert stays where it
      // is in v53 (order unchanged); a repeat delivery skips only the alert and checkout_completed.
      const claim = await claimCheckoutSession(supabase, typeof obj.id === "string" ? obj.id : null, "base", meta.user_id ?? null, typeof obj.livemode === "boolean" ? obj.livemode : null);
      const firstDelivery = claim !== "repeat";
      if (!firstDelivery) console.log("checkout.session.completed repeat delivery; PAID alert and checkout_completed skipped", obj.id);
      if (alertJim && firstDelivery) await sendEmail(BRAND_HQ, JIM_EMAIL, `New Base PAID: ${email}`,
        `<p>New ROMRx Base membership activated.</p>
         <p><strong>Email:</strong> ${email}<br>
         <strong>User ID:</strong> ${meta.user_id}<br>
         <strong>Stripe customer:</strong> ${customerId}<br>
         <strong>pending_sport:</strong> ${pendingSport ?? "none"}</p>`);

      if (pendingSport) {
        await supabase.from("sport_entitlements").upsert({
          user_id: meta.user_id,
          sport: pendingSport,
          status: "active",
          stripe_subscription_id: subId ?? null,
          expires_at: expiry,
        }, { onConflict: "user_id,sport" });
        await supabase.rpc("add_sport_access", { p_user_id: meta.user_id, p_sport: pendingSport });
      }

      if (firstDelivery) await logEvent("checkout_completed", { userId: meta.user_id, sport: pendingSport ?? "general", source: "stripe",
        props: { purpose: "base", pending_sport: pendingSport, amount_total: obj.amount_total ?? null, currency: obj.currency ?? null, discount: !!(obj.total_details as Record<string, unknown> | undefined)?.amount_discount, stripe_checkout_session_id: typeof obj.id === "string" ? obj.id : null } });

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && meta.user_id && meta.sport) {
      await supabase.from("sport_entitlements").upsert({
        user_id: meta.user_id,
        sport: meta.sport,
        status: "active",
        stripe_subscription_id: subId ?? null,
        expires_at: expiry,
      }, { onConflict: "user_id,sport" });

      await supabase.rpc("add_sport_access", { p_user_id: meta.user_id, p_sport: meta.sport });
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", meta.user_id);

      const { data: sportUser } = await supabase.from("users").select("full_name").eq("id", meta.user_id).maybeSingle();
      const sportName = sportUser?.full_name ?? (email ? email.split("@")[0] : "there");
      const firstName = String(sportName).split(" ")[0] || "there";
      const brand = brandFor(meta.sport);

      // v40: consent record for sport unlock sessions too.
      if (arlOn) await writeBillingConsent(supabase, obj, meta, meta.user_id, !testEvent, await arlAmounts(stripe, meta, subId), await subTrialEndIso(stripe, subId));

      // v40: 3c-2 acknowledgment replaces "Your {sport} pack is unlocked" (Legal: the old email alone does not comply).
      const sportAmounts = arlOn ? await arlAmounts(stripe, meta, subId) : [];
      const sportPack = SPORT_PACK_NAMES[meta.sport] ?? null;
      if (arlOn && email && sportAmounts.length && sportPack) {
        const resendId = await sendArlSportAck(email, obj.id as string, formatUsd(sportAmounts[0]), sportPack, meta.arl_period !== "paid");
        await logEvent("email_sent", { userId: meta.user_id, sport: meta.sport, source: "stripe",
          props: { email_id: "arl_ack_sport", template_version: ARL_ACK_VERSION, resend_id: resendId, checkout_session: obj.id, testmode: testEvent } });
      } else if (arlOn && email) {
        console.error("ARL sport ack not sent: missing amount or pack name", obj.id);
        await logEvent("arl_ack_skipped_amounts_unavailable", { userId: meta.user_id, sport: meta.sport, source: "stripe",
          props: { email_id: "arl_ack_sport", checkout_session: obj.id, testmode: testEvent, reason: sportAmounts.length ? "pack_name_missing" : "amounts_unavailable" } });
      }

      // P1-22: claim this checkout session right before the PAID alert. The alert stays where it
      // is in v53 (order unchanged); a repeat delivery skips only the alert and checkout_completed.
      const claim = await claimCheckoutSession(supabase, typeof obj.id === "string" ? obj.id : null, "sport_unlock", meta.user_id ?? null, typeof obj.livemode === "boolean" ? obj.livemode : null);
      const firstDelivery = claim !== "repeat";
      if (!firstDelivery) console.log("checkout.session.completed repeat delivery; PAID alert and checkout_completed skipped", obj.id);
      if (alertJim && firstDelivery) await sendEmail(brand, JIM_EMAIL, `New Sport PAID: ${email} - ${meta.sport}`,
        `<p>New Sport pack purchase activated.</p>
         <p><strong>Email:</strong> ${email}<br>
         <strong>User ID:</strong> ${meta.user_id}<br>
         <strong>Sport:</strong> ${meta.sport}<br>
         <strong>Stripe customer:</strong> ${customerId}</p>`);

      if (firstDelivery) await logEvent("checkout_completed", { userId: meta.user_id, sport: meta.sport, source: "stripe",
        props: { purpose: "sport_unlock", amount_total: obj.amount_total ?? null, currency: obj.currency ?? null, stripe_checkout_session_id: typeof obj.id === "string" ? obj.id : null } });

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    const userId     = meta.supabase_user_id ?? null;
    const plan       = (meta.plan ?? "athlete").toLowerCase();
    const gym        = meta.gym ?? "";

    if (userId) {
      if (plan === "coach") {
        await supabase.from("users").upsert({
          id: userId, email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId ?? null,
          subscription_status: "active",
          subscription_expiry: expiry,
          subscription_tier: "coach",
          portal_role: "coach",
          paywall_frozen_until: null,
        }, { onConflict: "id" });

        await supabase.from("coaches").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

        const { data: coachUser } = await supabase.from("users").select("full_name, active_sport").eq("id", userId).maybeSingle();
        const coachName = coachUser?.full_name ?? email.split("@")[0];
        const brand = brandFor(coachUser?.active_sport as string | undefined);

        await sendEmail(brand, email, `Welcome to ${brand.name} Coach - Your dashboard is ready`,
          `<div style="font-family:Inter,sans-serif;padding:24px"><h1>Welcome to ${brand.name} Coach, ${coachName}</h1><p>Your coach subscription is active.</p><a href="${brand.login}">Go to My Team Dashboard</a></div>`);

        await sendEmail(brand, JIM_EMAIL, `New Coach PAID: ${email}`,
          `<p>New ${brand.name} coach subscription activated.</p>
           <p><strong>Email:</strong> ${email}<br>
           <strong>Name:</strong> ${coachName}<br>
           <strong>Gym:</strong> ${gym || "Not specified"}<br>
           <strong>Plan:</strong> Coach $349/yr<br>
           <strong>Stripe customer:</strong> ${customerId}</p>`);

      } else {
        await supabase.from("users").update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subId ?? null,
          subscription_status: "active",
          subscription_expiry: expiry,
          paywall_frozen_until: null,
        }).eq("id", userId);

        await supabase.from("athletes").upsert({
          user_id: userId, email,
          onboarding_status: "active",
          is_active: true,
        }, { onConflict: "user_id", ignoreDuplicates: true });

        const { data: athUser } = await supabase.from("users").select("full_name, active_sport").eq("id", userId).maybeSingle();
        const brand = brandFor(athUser?.active_sport as string | undefined);
        const athName = athUser?.full_name ?? email.split("@")[0];
        const firstName = String(athName).split(" ")[0] || "there";

        await sendEmail(brand, email, `You're in. Let's go.`, `<p>Hey ${firstName}, you're in. <a href="${brand.dashboard}">Dashboard</a></p>`);

        await sendEmail(brand, JIM_EMAIL, `New Athlete PAID: ${email}`,
          `<p>New ${brand.name} athlete subscription activated.</p>
           <p><strong>Email:</strong> ${email}<br>
           <strong>Name:</strong> ${athUser?.full_name ?? "Unknown"}<br>
           <strong>Plan:</strong> Athlete $149/yr<br>
           <strong>Stripe customer:</strong> ${customerId}</p>`);
      }

    } else if (email) {
      await supabase.from("users").update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subId ?? null,
        subscription_status: "active",
        subscription_expiry: expiry,
        paywall_frozen_until: null,
      }).eq("email", email);
    }
  }

  if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const customerId = obj.customer as string;
    const subId      = obj.id as string;
    const stripeStatus = obj.status as string;
    const expiry     = subPeriodEndIso(obj); // guard-20261028: top-level, then items[0], then trial_end; null only if all missing
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const purpose    = (meta.purpose ?? "").toLowerCase();
    const userId     = meta.user_id ?? meta.supabase_user_id ?? null;

    if (purpose === "base" && userId) {
      // Jim 2026-09-29 (decision c): on cancel, Base access ends IMMEDIATELY (free period included). A scheduled
      // cancel (cancel_at_period_end / cancel_at, e.g. portal still in period-end mode) is converted to an immediate
      // Stripe cancel with no proration, and access is revoked now. Status canceled revokes too.
      const st = cancelState(obj, false);
      const scheduled = arlOn && stripeStatus !== "canceled" && (st.cancel_at_period_end || !!st.cancel_at);
      const revoked = arlOn && (stripeStatus === "canceled" || scheduled);
      const basePatch2: Record<string, unknown> = {
        base_status: revoked ? "canceled" : toBaseStatus(stripeStatus),
        base_stripe_subscription_id: subId,
        stripe_customer_id: customerId,
      };
      if (expiry) basePatch2.base_expiry = expiry; // guard-20261028: never write NULL; if all period fields are missing leave the column untouched
      else console.warn("guard: no current_period_end/items/trial_end on", type, "; base_expiry left untouched", userId);
      const { error: baseUpdErr } = await supabase.from("users").update(basePatch2).eq("id", userId);
      if (baseUpdErr) console.error("base_status update failed", stripeStatus, baseUpdErr.message);

      // v40: keep cancel_at / canceled_at for records.
      if (arlOn) await recordBaseCancelState(supabase, userId, { ...st, canceled_at: st.canceled_at ?? (revoked ? new Date().toISOString() : null) });
      if (revoked) {
        if (scheduled) {
          try { await cancelStripeSub(subId); } catch (e) { console.error("immediate cancel failed", subId, (e as Error)?.message); }
        }
        // Combo pack rides on this subscription; separate pack subs are canceled too (Jim lock 2026-09-08).
        try { await cancelAllSportPacksForUser(supabase, userId, { alsoCancelStripe: true, skipSubId: subId }); }
        catch (e) { console.error("sport cascade error (Base already revoked)", (e as Error)?.message); }
        return new Response(JSON.stringify({ received: true, base_revoked: true }), { headers: { "Content-Type": "application/json" } });
      }

      // Dual-unlock pending_sport mirrors Base standing
      const pendingSport = (meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding")
        ? meta.pending_sport
        : null;
      if (pendingSport) {
        await supabase.from("sport_entitlements").upsert({
          user_id: userId,
          sport: pendingSport,
          status: toEntitlementStatus(stripeStatus),
          stripe_subscription_id: subId,
          expires_at: expiry,
        }, { onConflict: "user_id,sport" });
        if (arlOn) await recordSportCancelState(supabase, userId, pendingSport, st); // combo: same subscription as Base
        const sportGoodStanding = stripeStatus === "active" || stripeStatus === "trialing";
        if (sportGoodStanding) {
          await supabase.rpc("add_sport_access", { p_user_id: userId, p_sport: pendingSport });
        } else if (stripeStatus === "past_due" || stripeStatus === "paused") {
          // keep access during the grace window; hard cancel below removes it
        }
      }

      // Jim lock: Base hard-cancel cancels ALL sport packs (not only pending_sport)
      if (isBaseHardCancel(stripeStatus)) {
        await cancelAllSportPacksForUser(supabase, userId, {
          alsoCancelStripe: true,
          skipSubId: subId,
        });
      }

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && userId && meta.sport) {
      await supabase.from("sport_entitlements").upsert({
        user_id: userId,
        sport: meta.sport,
        status: toEntitlementStatus(stripeStatus),
        stripe_subscription_id: subId,
        expires_at: expiry,
      }, { onConflict: "user_id,sport" });

      if (arlOn) await recordSportCancelState(supabase, userId, meta.sport, cancelState(obj, false)); // v40
      const sportGoodStanding = stripeStatus === "active" || stripeStatus === "trialing";
      const sportHardCancel = isBaseHardCancel(stripeStatus);
      if (sportGoodStanding) {
        await supabase.rpc("add_sport_access", { p_user_id: userId, p_sport: meta.sport });
      } else if (sportHardCancel) {
        await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: meta.sport });
      }

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    const goodStanding = stripeStatus === "active" || stripeStatus === "trialing";
    const patch: Record<string, unknown> = {
      subscription_status: stripeStatus,
      subscription_expiry: expiry,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
    };
    if (goodStanding) patch.paywall_frozen_until = null;

    if (userId) {
      await supabase.from("users").update(patch).eq("id", userId);
    } else {
      await supabase.from("users").update(patch).eq("stripe_customer_id", customerId);
    }
  }

  if (type === "customer.subscription.deleted" || type === "customer.subscription.paused") {
    const customerId = obj.customer as string;
    const subId      = obj.id as string;
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const purpose    = (meta.purpose ?? "").toLowerCase();
    const userId     = meta.user_id ?? meta.supabase_user_id ?? null;

    if (purpose === "base" && userId) {
      // Jim lock 2026-09-08: Base cancel → sport packs cancel too (replaces Option 3)
      await supabase.from("users").update({
        base_status: "canceled",
      }).eq("id", userId);
      if (arlOn && type === "customer.subscription.deleted") await recordBaseCancelState(supabase, userId, cancelState(obj, true)); // v40
      await cancelAllSportPacksForUser(supabase, userId, {
        alsoCancelStripe: true,
        skipSubId: subId,
      });
      if (alertJim) await sendEmail(BRAND_HQ, JIM_EMAIL, `Base canceled, sport packs cascaded: ${userId}`,
        `<p>Base subscription deleted/paused. Sport entitlements canceled and separate sport Stripe subs canceled when present.</p>
         <p><strong>User ID:</strong> ${userId}<br><strong>Customer:</strong> ${customerId}</p>`);
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && userId && meta.sport) {
      await supabase.from("sport_entitlements").update({
        status: "canceled",
      }).eq("user_id", userId).eq("sport", meta.sport);
      if (arlOn && type === "customer.subscription.deleted") await recordSportCancelState(supabase, userId, meta.sport, cancelState(obj, true)); // v40
      await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: meta.sport });
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    await supabase.from("users").update({
      subscription_status: "canceled",
      paywall_frozen_until: null,
    }).eq("stripe_customer_id", customerId);
  }

  if (type === "invoice.payment_failed") {
    const customerId = obj.customer as string;
    const subId      = obj.subscription as string | undefined;

    // v38: Base subscription invoice failed -> base_status past_due (dashboard gate closes until cured).
    if (subId) {
      const { data: baseRows } = await supabase.from("users").select("id, email")
        .eq("base_stripe_subscription_id", subId).neq("base_status", "canceled");
      for (const b of baseRows ?? []) {
        await supabase.from("users").update({ base_status: "past_due" }).eq("id", b.id);
        await sendEmail(BRAND_HQ, JIM_EMAIL, `Base payment FAILED: ${b.email}`,
          `<p>Base invoice payment failed. base_status set to past_due.</p><p><strong>User ID:</strong> ${b.id}<br><strong>Subscription:</strong> ${subId}<br><strong>Customer:</strong> ${customerId}</p>`);
      }
    }

    const { data: u } = await supabase
      .from("users")
      .select("id, email, full_name, paywall_frozen_until, active_sport")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (u) {
      const now = Date.now();
      const existingDeadline = u.paywall_frozen_until ? new Date(u.paywall_frozen_until).getTime() : 0;

      if (existingDeadline && now > existingDeadline) {
        if (subId) await cancelStripeSub(subId);
        await supabase.from("users").update({
          subscription_status: "canceled",
          paywall_frozen_until: null,
        }).eq("id", u.id);

        const brand = brandFor(u.active_sport as string | undefined);
        await sendEmail(brand, JIM_EMAIL, `Subscription canceled after 90-day past_due: ${u.email}`,
          `<p>${brand.name} subscription auto-canceled after the 90-day grace window.</p>
           <p><strong>Email:</strong> ${u.email}<br><strong>Customer:</strong> ${customerId}</p>`);

      } else {
        const deadline = new Date(now + FREEZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("users").update({
          subscription_status: "past_due",
          paywall_frozen_until: u.paywall_frozen_until ?? deadline,
        }).eq("id", u.id);

        const brand = brandFor(u.active_sport as string | undefined);
        const firstName = String(u.full_name ?? u.email.split("@")[0]).split(" ")[0];
        const portalUrl = brand.login.replace("/login", "/dashboard/settings");
        if (!u.paywall_frozen_until) {
          await sendEmail(brand, u.email, `Action needed: your ${brand.name} payment failed`,
            `<div style="font-family:Inter,sans-serif;padding:24px;color:#1a2e2e"><h2>Hey ${firstName},</h2><p>Your most recent ${brand.name} payment didn't go through. Update your card within 90 days.</p><p><a href="${portalUrl}">Update Payment</a></p><p>Jim</p></div>`);
        }
      }
    }
  }

  if (type === "invoice.payment_succeeded") {
    const customerId = obj.customer as string;
    const subId      = obj.subscription as string | undefined;

    // v38: Base renewal / cure -> base_status active and base_expiry refreshed from the subscription.
    if (subId) {
      const { data: baseRows } = await supabase.from("users").select("id, base_status")
        .eq("base_stripe_subscription_id", subId);
      if (baseRows && baseRows.length) {
        const newExpiry = await periodEndFromSubscription(stripe, subId);
        for (const b of baseRows) {
          const patch: Record<string, unknown> = { base_status: "active" };
          if (newExpiry) patch.base_expiry = newExpiry;
          await supabase.from("users").update(patch).eq("id", b.id);
        }
        return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
      }
    }

    await supabase.from("users").update({
      subscription_status: "active",
      paywall_frozen_until: null,
    }).eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
