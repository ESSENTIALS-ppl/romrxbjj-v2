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
const STRIPE_SECRET_FOR_CANCEL = Deno.env.get("stripe_secret_key") ?? "";
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

/**
 * F-07: duplicate-subscription guard for checkout.session.completed.
 * If the user already has a DIFFERENT live subscription for the same thing (Base, or a sport pack), the new
 * subscription is canceled and Jim is alerted to refund the first charge. Replays of the same event are not duplicates.
 */
async function cancelDuplicateSub(subId: string | undefined, userId: string, what: string, existingSubId: string, email: string, alert: boolean) {
  if (!subId) return;
  try { await cancelStripeSub(subId); } catch (e) { console.error("duplicate cancel failed", subId, (e as Error)?.message); }
  if (alert) {
    await sendEmail(BRAND_HQ, JIM_EMAIL, `DUPLICATE ${what} subscription canceled: ${email}`,
      `<p>A second ${what} checkout completed while one was already live. The new subscription was canceled automatically; refund the first charge in Stripe.</p>
       <p><strong>User ID:</strong> ${userId}<br><strong>Kept subscription:</strong> ${existingSubId}<br><strong>Canceled subscription:</strong> ${subId}</p>`);
  }
}

/**
 * F-07: is this subscription superseded? True when the user already has a DIFFERENT live subscription recorded for
 * the same thing (Base or a sport pack). Events for a superseded sub (created/updated/deleted) must not overwrite or
 * revoke the live one. The recorded id is only ever set by this webhook, so null never counts as superseded.
 */
async function isSupersededSub(sb: ReturnType<typeof createClient>, kind: "base" | "sport", userId: string, sport: string | null, subId: string): Promise<boolean> {
  if (!subId) return false;
  if (kind === "base") {
    const { data } = await sb.from("users").select("base_status, base_stripe_subscription_id").eq("id", userId).maybeSingle();
    return !!data && data.base_status === "active"
      && !!data.base_stripe_subscription_id && data.base_stripe_subscription_id !== subId;
  }
  const { data } = await sb.from("sport_entitlements").select("status, stripe_subscription_id")
    .eq("user_id", userId).eq("sport", sport ?? "").maybeSingle();
  return !!data && (data.status === "active" || data.status === "trialing")
    && !!data.stripe_subscription_id && data.stripe_subscription_id !== subId;
}

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

// Jim 2026-09-29 (decision c): cancel = immediate, no future charges, no refunds (no proration, no final invoice).
async function cancelStripeSub(subId: string) {
  if (!CURRENT_CANCEL_KEY || !subId) return;
  await fetch(`https://api.stripe.com/v1/subscriptions/${subId}?prorate=false&invoice_now=false`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CURRENT_CANCEL_KEY}` },
  });
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
  if (!res.ok) { console.error("ARL ack Resend error", res.status, JSON.stringify(data)); return null; }
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

/** v40: one consent record per Checkout Session (spec 4C). Service role only; never stores IP. */
async function writeBillingConsent(supabase: ReturnType<typeof createClient>, obj: Record<string, unknown>, meta: Record<string, string>, userId: string, livemode: boolean, amounts: number[]) {
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
    trial_end: new Date(1798822800 * 1000).toISOString(),
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

async function periodEndFromSubscription(stripe: Stripe, subId: string | undefined | null): Promise<string | null> {
  if (!subId) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    const end = (sub as unknown as { current_period_end?: number }).current_period_end;
    return end ? new Date(end * 1000).toISOString() : null;
  } catch (e) {
    console.error("subscriptions.retrieve failed", subId, String(e));
    return null;
  }
}

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET  = Deno.env.get("stripe_secret_key") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? Deno.env.get("stripe_webhook_secret") ?? "";
// v40 fixture-only test mode. Both must be set for test events to be accepted.
const STRIPE_TEST_WEBHOOK_SECRET = (Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") ?? "").trim();
const STRIPE_TEST_SECRET = (Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "").trim();
// Release gate (Jim: no real-user behavior change until release GO). LIVE-signed events keep the exact v41 behavior
// (old acknowledgment emails, no consent rows, no immediate-cancel conversion, no cancel-state writes) unless
// ARL_LIVE_ENABLED=true. Test-signed fixture events always get the new ARL behavior.
const ARL_LIVE = (Deno.env.get("ARL_LIVE_ENABLED") ?? "").toLowerCase() === "true";
const TEST_MODE_READY = STRIPE_TEST_WEBHOOK_SECRET.startsWith("whsec_") && STRIPE_TEST_SECRET.startsWith("sk_test_");

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
        sk_prefix_ok: STRIPE_TEST_SECRET.startsWith("sk_test_"), live_err: String((liveErr as Error)?.message ?? liveErr).slice(0, 80),
      }));
      return new Response("Invalid signature", { status: 400 });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_TEST_WEBHOOK_SECRET);
      if (event.livemode !== false) return new Response("Invalid signature", { status: 400 });
      testEvent = true;
    } catch (testErr) {
      console.error("webhook verify failed (live and test)", JSON.stringify({
        whsec_len: STRIPE_TEST_WEBHOOK_SECRET.length, test_err: String((testErr as Error)?.message ?? testErr).slice(0, 120),
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
  }
  const alertJim = !testEvent; // no internal PAID alerts for fixture test events
  const arlOn = testEvent || ARL_LIVE;

  if (type === "checkout.session.completed") {
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const customerId = obj.customer as string;
    const email      = ((obj.customer_details as Record<string, string>)?.email ?? "").toLowerCase();
    const subId      = obj.subscription as string | undefined;
    // v38: current_period_end lives on the Subscription, not the Checkout Session.
    const expiry     = (await periodEndFromSubscription(stripe, subId))
      ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const purpose = (meta.purpose ?? "").toLowerCase();

    if (purpose === "base" && meta.user_id) {
      {
        const { data: prior } = await supabase.from("users").select("base_status, base_stripe_subscription_id").eq("id", meta.user_id).maybeSingle();
        if (prior?.base_status === "active" && prior.base_stripe_subscription_id && subId && prior.base_stripe_subscription_id !== subId) {
          await cancelDuplicateSub(subId, meta.user_id, "Base", prior.base_stripe_subscription_id as string, email, alertJim);
          return new Response(JSON.stringify({ received: true, duplicate_canceled: true }), { headers: { "Content-Type": "application/json" } });
        }
      }
      await supabase.from("users").update({
        stripe_customer_id: customerId,
        base_status: "active",
        base_stripe_subscription_id: subId ?? null,
        base_expiry: expiry,
      }).eq("id", meta.user_id);

      const { data: baseUser } = await supabase.from("users").select("full_name").eq("id", meta.user_id).maybeSingle();
      const baseName = baseUser?.full_name ?? (email ? email.split("@")[0] : "there");
      const firstName = String(baseName).split(" ")[0] || "there";

      const pendingSport = (meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding")
        ? meta.pending_sport
        : null;

      if (!arlOn) {
        // v41 (live) behavior, unchanged.
        if (email) {
          await sendEmail(BRAND_HQ, email, `You didn't buy a subscription. You made an investment.`, `<p>Hey ${firstName}, your ROMRx Base is active. <a href="${BRAND_HQ.dashboard}">Dashboard</a></p>`);
        }
      }
      // v40: consent record + 3c acknowledgment (replaces "You didn't buy a subscription...").
      const amounts = arlOn ? await arlAmounts(stripe, meta, subId) : [];
      if (arlOn) await writeBillingConsent(supabase, obj, meta, meta.user_id, !testEvent, amounts);
      if (arlOn && email && amounts.length) {
        const sportPack = pendingSport && amounts.length > 1 ? SPORT_PACK_NAMES[pendingSport] : null;
        const sportPrice = sportPack ? formatUsd(amounts[1]) : null;
        const resendId = await sendArlAck(email, obj.id as string, formatUsd(amounts[0]), sportPack, sportPrice);
        await logEvent("email_sent", { userId: meta.user_id, sport: pendingSport ?? "general", source: "stripe",
          props: { email_id: "arl_ack", template_version: ARL_ACK_VERSION, resend_id: resendId, checkout_session: obj.id, testmode: testEvent } });
      } else if (arlOn && email) {
        console.error("ARL ack not sent: no price amounts for session", obj.id);
      }

      if (alertJim) await sendEmail(BRAND_HQ, JIM_EMAIL, `New Base PAID: ${email}`,
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

      await logEvent("checkout_completed", { userId: meta.user_id, sport: pendingSport ?? "general", source: "stripe",
        props: { purpose: "base", pending_sport: pendingSport, amount_total: obj.amount_total ?? null, currency: obj.currency ?? null, discount: !!(obj.total_details as Record<string, unknown> | undefined)?.amount_discount } });

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && meta.user_id && meta.sport) {
      {
        const { data: priorEnt } = await supabase.from("sport_entitlements").select("status, stripe_subscription_id")
          .eq("user_id", meta.user_id).eq("sport", meta.sport).maybeSingle();
        if (priorEnt && (priorEnt.status === "active" || priorEnt.status === "trialing") && priorEnt.stripe_subscription_id
            && subId && priorEnt.stripe_subscription_id !== subId) {
          await cancelDuplicateSub(subId, meta.user_id, `${meta.sport} pack`, priorEnt.stripe_subscription_id as string, email, alertJim);
          return new Response(JSON.stringify({ received: true, duplicate_canceled: true }), { headers: { "Content-Type": "application/json" } });
        }
      }
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

      if (!arlOn) {
        // v41 (live) behavior, unchanged.
        if (email) {
          await sendEmail(brand, email, `Your ${meta.sport} pack is unlocked`, `<p>Hey ${firstName}, your ${meta.sport} pack is unlocked. <a href="${brand.dashboard}">Dashboard</a></p>`);
        }
      }
      // v40: consent record for sport unlock sessions too.
      if (arlOn) await writeBillingConsent(supabase, obj, meta, meta.user_id, !testEvent, await arlAmounts(stripe, meta, subId));

      // v40: 3c-2 acknowledgment replaces "Your {sport} pack is unlocked" (Legal: the old email alone does not comply).
      const sportAmounts = arlOn ? await arlAmounts(stripe, meta, subId) : [];
      const sportPack = SPORT_PACK_NAMES[meta.sport] ?? null;
      if (arlOn && email && sportAmounts.length && sportPack) {
        const resendId = await sendArlSportAck(email, obj.id as string, formatUsd(sportAmounts[0]), sportPack, meta.arl_period !== "paid");
        await logEvent("email_sent", { userId: meta.user_id, sport: meta.sport, source: "stripe",
          props: { email_id: "arl_ack_sport", template_version: ARL_ACK_VERSION, resend_id: resendId, checkout_session: obj.id, testmode: testEvent } });
      } else if (arlOn && email) {
        console.error("ARL sport ack not sent: missing amount or pack name", obj.id);
      }

      if (alertJim) await sendEmail(brand, JIM_EMAIL, `New Sport PAID: ${email} - ${meta.sport}`,
        `<p>New Sport pack purchase activated.</p>
         <p><strong>Email:</strong> ${email}<br>
         <strong>User ID:</strong> ${meta.user_id}<br>
         <strong>Sport:</strong> ${meta.sport}<br>
         <strong>Stripe customer:</strong> ${customerId}</p>`);

      await logEvent("checkout_completed", { userId: meta.user_id, sport: meta.sport, source: "stripe",
        props: { purpose: "sport_unlock", amount_total: obj.amount_total ?? null, currency: obj.currency ?? null } });

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
    const expiry     = obj.current_period_end ? new Date((obj.current_period_end as number) * 1000).toISOString() : null;
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const purpose    = (meta.purpose ?? "").toLowerCase();
    const userId     = meta.user_id ?? meta.supabase_user_id ?? null;

    if (purpose === "base" && userId) {
      if (await isSupersededSub(supabase, "base", userId, null, subId)) {
        console.warn("superseded subscription event ignored", type, subId);
        return new Response(JSON.stringify({ received: true, ignored: "superseded_subscription" }), { headers: { "Content-Type": "application/json" } });
      }
      // Jim 2026-09-29 (decision c): on cancel, Base access ends IMMEDIATELY (free period included). A scheduled
      // cancel (cancel_at_period_end / cancel_at, e.g. portal still in period-end mode) is converted to an immediate
      // Stripe cancel with no proration, and access is revoked now. Status canceled revokes too.
      const st = cancelState(obj, false);
      const scheduled = arlOn && stripeStatus !== "canceled" && (st.cancel_at_period_end || !!st.cancel_at);
      const revoked = arlOn && (stripeStatus === "canceled" || scheduled);
      const { error: baseUpdErr } = await supabase.from("users").update({
        base_status: revoked ? "canceled" : toBaseStatus(stripeStatus),
        base_expiry: expiry,
        base_stripe_subscription_id: subId,
        stripe_customer_id: customerId,
      }).eq("id", userId);
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
      if (await isSupersededSub(supabase, "sport", userId, meta.sport, subId)) {
        console.warn("superseded subscription event ignored", type, subId);
        return new Response(JSON.stringify({ received: true, ignored: "superseded_subscription" }), { headers: { "Content-Type": "application/json" } });
      }
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
      if (await isSupersededSub(supabase, "base", userId, null, subId)) {
        console.warn("superseded subscription event ignored", type, subId);
        return new Response(JSON.stringify({ received: true, ignored: "superseded_subscription" }), { headers: { "Content-Type": "application/json" } });
      }
      // Jim lock 2026-09-08: Base cancel → sport packs cancel too (replaces Option 3)
      await supabase.from("users").update({
        base_status: "canceled",
      }).eq("id", userId);
      if (arlOn && type === "customer.subscription.deleted") await recordBaseCancelState(supabase, userId, cancelState(obj, true)); // v40
      await cancelAllSportPacksForUser(supabase, userId, {
        alsoCancelStripe: true,
        skipSubId: subId,
      });
      if (alertJim) await sendEmail(BRAND_HQ, JIM_EMAIL, `Base canceled — sport packs cascaded: ${userId}`,
        `<p>Base subscription deleted/paused. Sport entitlements canceled and separate sport Stripe subs canceled when present.</p>
         <p><strong>User ID:</strong> ${userId}<br><strong>Customer:</strong> ${customerId}</p>`);
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && userId && meta.sport) {
      if (await isSupersededSub(supabase, "sport", userId, meta.sport, subId)) {
        console.warn("superseded subscription event ignored", type, subId);
        return new Response(JSON.stringify({ received: true, ignored: "superseded_subscription" }), { headers: { "Content-Type": "application/json" } });
      }
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
