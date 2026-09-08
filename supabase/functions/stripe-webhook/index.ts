// v36 dual-unlock pending_sport grant — Stripe constructEvent with STRIPE_WEBHOOK_SECRET (2026-09-06)
// 'active' (same as cash-paid), no separate "trialing" branch from signup.
//  - past-90-day past_due check: cancel the Stripe sub if still unpaid
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

// stripe-webhook mail/brand helpers (Sprint 2 module split)
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const STRIPE_SECRET_FOR_CANCEL = Deno.env.get("stripe_secret_key") ?? "";
const JIM_EMAIL = "jim@romrx.io";

const FREEZE_DAYS = 90;

// -- Per-brand sender identity ------------------------------------------
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
  accent: "#0047AB", // Cobalt
};

async function sendEmail(brand: Brand, to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: brand.from, to: [to], subject, html, reply_to: brand.replyTo }),
  });
}

async function cancelStripeSub(subId: string) {
  if (!STRIPE_SECRET_FOR_CANCEL) return;
  await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_FOR_CANCEL}` },
  });
}

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET  = Deno.env.get("stripe_secret_key") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? Deno.env.get("stripe_webhook_secret") ?? "";

Deno.serve(async (req: Request) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  const stripe = new Stripe(STRIPE_SECRET || "sk_unused", { apiVersion: "2024-11-20.acacia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC);
  const type = event.type as string;
  const obj  = event.data.object as Record<string, unknown>;

  // -----------------------------------------------------------------
  // checkout.session.completed
  // -----------------------------------------------------------------
  if (type === "checkout.session.completed") {
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const customerId = obj.customer as string;
    const email      = ((obj.customer_details as Record<string, string>)?.email ?? "").toLowerCase();
    const subId      = obj.subscription as string | undefined;
    const subEnd     = obj.current_period_end as number | undefined;
    const expiry     = subEnd
      ? new Date(subEnd * 1000).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const purpose = (meta.purpose ?? "").toLowerCase();

    if (purpose === "base" && meta.user_id) {
      // New Base membership - write users.base_status
      await supabase.from("users").update({
        stripe_customer_id: customerId,
        base_status: "active",
        base_stripe_subscription_id: subId ?? null,
        base_expiry: expiry,
      }).eq("id", meta.user_id);

      const { data: baseUser } = await supabase.from("users").select("full_name").eq("id", meta.user_id).maybeSingle();
      const baseName = baseUser?.full_name ?? (email ? email.split("@")[0] : "there");
      const firstName = String(baseName).split(" ")[0] || "there";

      // Fire welcome email using the existing sendEmail() pattern.
      // Uses ROMRx (generic) brand since Base is sport-agnostic.
      if (email) {
        await sendEmail(BRAND_HQ, email, `You didn't buy a subscription. You made an investment.`, `<p>Hey ${firstName}, your ROMRx Base is active. <a href="${BRAND_HQ.dashboard}">Dashboard</a></p>`);
      }

      // Send Jim internal notification too.
      const pendingSport = (meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding")
        ? meta.pending_sport
        : null;
      await sendEmail(BRAND_HQ, JIM_EMAIL, `New Base PAID: ${email}`,
        `<p>New ROMRx Base membership activated.</p>
         <p><strong>Email:</strong> ${email}<br>
         <strong>User ID:</strong> ${meta.user_id}<br>
         <strong>Stripe customer:</strong> ${customerId}<br>
         <strong>pending_sport:</strong> ${pendingSport ?? "none"}</p>`);

      // Dual-unlock: grant sport when Base checkout included pending_sport
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

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && meta.user_id && meta.sport) {
      // New Sport pack purchase - insert/update sport_entitlements
      await supabase.from("sport_entitlements").upsert({
        user_id: meta.user_id,
        sport: meta.sport,
        status: "active",
        stripe_subscription_id: subId ?? null,
        expires_at: expiry,
      }, { onConflict: "user_id,sport" });

      // v33: keep legacy access signal (users.sports_enabled/platforms) in sync with the entitlement.
      await supabase.rpc("add_sport_access", { p_user_id: meta.user_id, p_sport: meta.sport });

      // Also update users.stripe_customer_id if not already set
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", meta.user_id);

      const { data: sportUser } = await supabase.from("users").select("full_name").eq("id", meta.user_id).maybeSingle();
      const sportName = sportUser?.full_name ?? (email ? email.split("@")[0] : "there");
      const firstName = String(sportName).split(" ")[0] || "there";
      const brand = brandFor(meta.sport);

      // Fire sport-branded welcome email (uses existing brandFor(meta.sport) logic)
      if (email) {
        await sendEmail(brand, email, `Your ${meta.sport} pack is unlocked`, `<p>Hey ${firstName}, your ${meta.sport} pack is unlocked. <a href="${brand.dashboard}">Dashboard</a></p>`);
      }

      // Send Jim internal notification
      await sendEmail(brand, JIM_EMAIL, `New Sport PAID: ${email} - ${meta.sport}`,
        `<p>New Sport pack purchase activated.</p>
         <p><strong>Email:</strong> ${email}<br>
         <strong>User ID:</strong> ${meta.user_id}<br>
         <strong>Sport:</strong> ${meta.sport}<br>
         <strong>Stripe customer:</strong> ${customerId}</p>`);

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    // If purpose is not set, fall through to the existing legacy handler below (unchanged).
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
        // Athlete plan
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

  // -----------------------------------------------------------------
  // customer.subscription.created / updated - mirror Stripe status exactly
  // -----------------------------------------------------------------
  if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const customerId = obj.customer as string;
    const subId      = obj.id as string;
    const stripeStatus = obj.status as string; // active|trialing|past_due|unpaid|canceled|incomplete|incomplete_expired
    const expiry     = obj.current_period_end ? new Date((obj.current_period_end as number) * 1000).toISOString() : null;
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const purpose    = (meta.purpose ?? "").toLowerCase();
    const userId     = meta.user_id ?? meta.supabase_user_id ?? null;

    if (purpose === "base" && userId) {
      await supabase.from("users").update({
        base_status: stripeStatus,
        base_expiry: expiry,
        base_stripe_subscription_id: subId,
        stripe_customer_id: customerId,
      }).eq("id", userId);

      // Dual-unlock: mirror pending_sport entitlement with Stripe standing
      const pendingSport = (meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding")
        ? meta.pending_sport
        : null;
      if (pendingSport) {
        await supabase.from("sport_entitlements").upsert({
          user_id: userId,
          sport: pendingSport,
          status: stripeStatus,
          stripe_subscription_id: subId,
          expires_at: expiry,
        }, { onConflict: "user_id,sport" });
        const sportGoodStanding = stripeStatus === "active" || stripeStatus === "trialing";
        const sportHardCancel = stripeStatus === "canceled" || stripeStatus === "unpaid" || stripeStatus === "incomplete_expired";
        if (sportGoodStanding) {
          await supabase.rpc("add_sport_access", { p_user_id: userId, p_sport: pendingSport });
        } else if (sportHardCancel) {
          await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: pendingSport });
        }
      }

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && userId && meta.sport) {
      await supabase.from("sport_entitlements").upsert({
        user_id: userId,
        sport: meta.sport,
        status: stripeStatus,
        stripe_subscription_id: subId,
        expires_at: expiry,
      }, { onConflict: "user_id,sport" });

      // v33: sync the legacy access signal (users.sports_enabled/platforms) with Stripe standing.
      // Grace policy (Option B): keep the sport during past_due; only remove on hard-cancel states.
      const sportGoodStanding = stripeStatus === "active" || stripeStatus === "trialing";
      const sportHardCancel = stripeStatus === "canceled" || stripeStatus === "unpaid" || stripeStatus === "incomplete_expired";
      if (sportGoodStanding) {
        await supabase.rpc("add_sport_access", { p_user_id: userId, p_sport: meta.sport });
      } else if (sportHardCancel) {
        await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: meta.sport });
      }
      // past_due / incomplete: leave arrays as-is (grace).

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Fall through to legacy handler (unchanged - handles the 16 existing users)
    // Mirror the Stripe value verbatim. Clear freeze if back to good standing.
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
    const meta       = (obj.metadata ?? {}) as Record<string, string>;
    const purpose    = (meta.purpose ?? "").toLowerCase();
    const userId     = meta.user_id ?? meta.supabase_user_id ?? null;

    if (purpose === "base" && userId) {
      // Base cancellation policy: Option 3 (30-day grace). Sport entitlements
      // are NOT auto-canceled here. Just mark Base as canceled.
      await supabase.from("users").update({
        base_status: "canceled",
      }).eq("id", userId);
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (purpose === "sport_unlock" && userId && meta.sport) {
      await supabase.from("sport_entitlements").update({
        status: "canceled",
      }).eq("user_id", userId).eq("sport", meta.sport);

      // v33: mirror removal from the legacy access signal so the sport disappears from the app.
      await supabase.rpc("remove_sport_access", { p_user_id: userId, p_sport: meta.sport });

      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Fall through to legacy handler (unchanged)
    await supabase.from("users").update({
      subscription_status: "canceled",
      paywall_frozen_until: null,
    }).eq("stripe_customer_id", customerId);
  }

  // -----------------------------------------------------------------
  // invoice.payment_failed - start the 90-day freeze countdown
  // -----------------------------------------------------------------
  if (type === "invoice.payment_failed") {
    const customerId = obj.customer as string;
    const subId      = obj.subscription as string | undefined;

    // Look up the user
    const { data: u } = await supabase
      .from("users")
      .select("id, email, full_name, paywall_frozen_until, active_sport")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (u) {
      const now = Date.now();
      const existingDeadline = u.paywall_frozen_until ? new Date(u.paywall_frozen_until).getTime() : 0;

      if (existingDeadline && now > existingDeadline) {
        // Past the 90-day grace window - cancel the Stripe sub now.
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
        // First (or ongoing) failure - set status to past_due, set/keep the 90d deadline.
        const deadline = new Date(now + FREEZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("users").update({
          subscription_status: "past_due",
          paywall_frozen_until: u.paywall_frozen_until ?? deadline,
        }).eq("id", u.id);

        const brand = brandFor(u.active_sport as string | undefined);
        const firstName = String(u.full_name ?? u.email.split("@")[0]).split(" ")[0];
        const portalUrl = brand.login.replace("/login", "/dashboard/settings");
        if (!u.paywall_frozen_until) {
          // Only email on the *first* failure of this cycle (when we set the deadline).
          await sendEmail(brand, u.email, `Action needed: your ${brand.name} payment failed`,
            `<div style="font-family:Inter,sans-serif;padding:24px;color:#1a2e2e"><h2>Hey ${firstName},</h2><p>Your most recent ${brand.name} payment didn't go through. Update your card within 90 days.</p><p><a href="${portalUrl}">Update Payment</a></p><p>&mdash; Jim</p></div>`);
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // invoice.payment_succeeded - clear the freeze, ensure active
  // -----------------------------------------------------------------
  if (type === "invoice.payment_succeeded") {
    const customerId = obj.customer as string;
    await supabase.from("users").update({
      subscription_status: "active",
      paywall_frozen_until: null,
    }).eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
