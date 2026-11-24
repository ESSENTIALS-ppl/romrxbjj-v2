// ROMRx send-renewal-reminders v7 (2026-11-15, BRANCH ONLY): Base-only recipients get the ROMRx Base brand (romrx.io sender, links, L1014 fine print); sport output unchanged. See email.ts.
// ROMRx send-renewal-reminders v6 (2026-11-02, FG-35: explicit legacy skip, send gated by RENEWAL_BASE_SEND). Based on v5 (2026-10-26): targets Base subscribers. v4 read users.subscription_expiry, empty for every
// active account, so the Jan 1, 2027 Base charge got no reminders. v5 reads Base billing state (users.base_*, billing_consents.trial_end),
// claims each reminder row BEFORE sending (unique user_id+reminder_type+subscription_expiry) so retries never double send,
// skips test fixtures and internal accounts, and supports ?dry_run=1 (cron secret still required; no sends, no writes).
// v4 (2026-10-01 security audit): fail-closed x-cron-secret gate
// (only pg_cron via public.cron_call_edge may trigger sends; was open to anonymous callers).
// From + reply_to use the per-brand jim@ alias (send-as aliases on jim@romrx.io
// so replies land in the unified inbox).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type CandidateRow, formatUsd, formatUsdYear, maskEmail, planReminders, sendEnabled } from "./logic.ts";
import { type Brand, brandFor, buildBaseEmail, buildBaseText, buildEmail, subjectFor, buildFirstChargeEmail, buildFirstChargeText, cardPhrase, firstChargeSubject } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// D3: read-only Stripe GET for the first-charge reminder's "{card_brand} ending {last4}". Same secret names as stripe-webhook; never logged.
const STRIPE_SECRET = (Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("stripe_secret_key") || "").trim();
async function cardOnFile(subId: string): Promise<{ brand: string; last4: string } | null> {
  if (!STRIPE_SECRET) return null;
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}?expand[]=default_payment_method`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
    });
    if (!r.ok) { console.error("cardOnFile: stripe status", r.status); return null; }
    const card = (await r.json())?.default_payment_method?.card;
    return card?.brand && card?.last4 ? { brand: String(card.brand), last4: String(card.last4) } : null;
  } catch (e) { console.error("cardOnFile failed", String(e)); return null; }
}

async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) {
    return false;
  }
}


// text is set for Base only; JSON.stringify drops an undefined text, so the sport request body is the same bytes as v26.
async function sendEmail(brand: Brand, to: string, subject: string, html: string, text?: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: brand.from, to: [to], subject, html, text, reply_to: brand.replyTo }),
  });
  if (!res.ok) { console.error("Resend error:", await res.text()); return false; }
  return true;
}

Deno.serve(async (req: Request) => {
  if (!(await cronCallerOk(req))) return new Response("forbidden", { status: 403 });
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now = new Date();
  const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });

  const { data: users, error } = await supabase.from("users")
    .select("id, email, full_name, active_sport, base_status, base_stripe_subscription_id, base_expiry, base_cancel_at_period_end, base_canceled_at, grandfathered_at, subscription_tier, subscription_expiry, stripe_subscription_id")
    .eq("base_status", "active").not("base_stripe_subscription_id", "is", null);
  if (error) return json({ success: false, error: error.message });

  const rows: CandidateRow[] = [];
  for (const u of users ?? []) {
    const { data: isTest } = await supabase.rpc("is_test_account", { p_email: u.email });
    const { data: consents } = await supabase.from("billing_consents")
      .select("stripe_subscription_id, trial_end, amounts, offer").eq("user_id", u.id);
    rows.push({ ...u, is_test: isTest === true, consents: consents ?? [] } as CandidateRow);
  }
  const { due, skipped } = planReminders(rows, now);
  const results: Record<string, { sent: number; skipped: number; errors: string[] }> = {};
  const bump = (t: string) => (results[t] ??= { sent: 0, skipped: 0, errors: [] });

  // v6: real sends stay OFF until RENEWAL_BASE_SEND is exactly "on" (not a credential; unset = plan only, no claims, no sends).
  // Reason: the Base reminder wording and brand (v5 reuses the BJJ brand and "All sales are final" line) need Jim and Stacy first.
  const sendOn = sendEnabled(Deno.env.get("RENEWAL_BASE_SEND"));
  if (dryRun || !sendOn) {
    return json({ success: true, dry_run: true, send_enabled: sendOn, date: now.toISOString(), skipped,
      due: due.map((d) => ({ email: maskEmail(d.email), type: d.type, days_until: d.days_until, charge_date: d.charge_date, first_charge: d.first_charge })) });
  }

  for (const d of due) {
    const r = bump(d.type);
    // Claim first: the unique key makes a second run (or a concurrent one) a no op.
    const { data: claim, error: claimErr } = await supabase.from("renewal_reminders")
      .insert({ user_id: d.user_id, reminder_type: d.type, subscription_expiry: d.charge_date }).select("id").maybeSingle();
    if (claimErr || !claim) {
      if (claimErr && claimErr.code !== "23505") r.errors.push(`claim failed: ${maskEmail(d.email)}`);
      r.skipped++;
      continue;
    }
    const brand = brandFor(d.active_sport);
    const price = formatUsdYear(d.amount_cents);
    const expiryFormatted = new Date(d.charge_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
    const firstName = (d.full_name ?? d.email).split(" ")[0];
    const subject = d.first_charge ? firstChargeSubject(expiryFormatted) : subjectFor(brand, d.days_until, d.label);
    // Renewal reminders are required account notices: no unsubscribe link, and marketing_opt_out never blocks them (Grant, 2026-10-04).
    // 2026-11-15: Base-only recipients (active_sport not exactly "bjj"/"bodybuilding") get the ROMRx Base email with a text part;
    // sport recipients get the unchanged v26 email. Base greets "there" when no name is on file (v26 used the email address).
    // D3: the sends before the charge that ends the beta launch trial period use Stacy's first-charge wording (any brand).
    const subId = String(users?.find((u) => u.id === d.user_id)?.base_stripe_subscription_id ?? "");
    const card = d.first_charge ? cardPhrase(await cardOnFile(subId)) : "";
    const greet = d.full_name ? firstName : "there";
    const sent = d.first_charge
      ? await sendEmail(brandFor(null), d.email, subject,
        buildFirstChargeEmail(greet, expiryFormatted, formatUsd(d.amount_cents), card, d.email),
        buildFirstChargeText(greet, expiryFormatted, formatUsd(d.amount_cents), card))
      : brand.key === "base"
      ? await sendEmail(brand, d.email, subject,
        buildBaseEmail(d.full_name ? firstName : "there", "ROMRx Base", price, d.days_until, expiryFormatted, d.label, d.email),
        buildBaseText(d.full_name ? firstName : "there", "ROMRx Base", price, d.days_until, expiryFormatted, d.label, d.email))
      : await sendEmail(brand, d.email, subject, buildEmail(brand, firstName, "ROMRx Base", price, d.days_until, expiryFormatted, d.label, d.email));
    if (sent) r.sent++;
    else {
      await supabase.from("renewal_reminders").delete().eq("id", claim.id); // release so tomorrow retries
      r.errors.push(`send failed: ${maskEmail(d.email)}`);
    }
  }
  return json({ success: true, date: now.toISOString(), skipped, results });
});
