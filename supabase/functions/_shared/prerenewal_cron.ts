// _shared/prerenewal_cron.ts - DRAFT (not deployed). Daily pg_cron sender for the Base pre-renewal reminder (Dec 18 run).
// Same copy (_shared/prerenewal_copy.ts) and same email_sends claim (email_id "base_trial_will_end") as the Stripe
// trial_will_end handler in stripe-webhook (PR #76), so a user can never get both. OFF unless PREREMINDER_CRON_ENABLED=true.
// Pure core with injected dependencies so it is unit-tested without network. No em dashes. American spelling.
import {
  PREREMINDER_COPY_VERSION, PREREMINDER_EMAIL_ID, decideReminder, reminderSubject, reminderHtml, reminderText,
} from "./prerenewal_copy.ts";

/** Base free trials created for the Jan 1, 2027 12:00 ET charge date (last free day Dec 31, 2026). */
export const TARGET_TRIAL_END_UNIX = 1798822800;
/** Send window (America/New_York dates, inclusive). The run date is the target; later days in the window catch up. */
export const WINDOW_START = "2026-12-11";
export const WINDOW_END = "2026-12-28";
export const DEFAULT_TARGET_DATE = "2026-12-18";
export const MAX_USERS = 2000;

/** YYYY-MM-DD in America/New_York for an epoch-ms instant. */
export function etDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

export type WindowState = { open: true } | { open: false; reason: string };
/**
 * Open from the target date (default Dec 18) through Dec 28 inclusive, ET. The target itself must lie inside
 * Dec 11-28. Before the target: closed. After Dec 28: closed (Stripe's own trial_will_end, ~Dec 29, goes through
 * the stripe-webhook handler and shares the same claim).
 */
export function sendWindow(todayEt: string, targetDate: string = DEFAULT_TARGET_DATE): WindowState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate < WINDOW_START || targetDate > WINDOW_END) {
    return { open: false, reason: "target_outside_window" };
  }
  if (todayEt < targetDate) return { open: false, reason: "before_target_date" };
  if (todayEt > WINDOW_END) return { open: false, reason: "after_window" };
  return { open: true };
}

/** Only Base subscriptions whose trial ends on the target charge date (within +/- 24h of the exact instant). */
export function trialEndMatches(trialEnd: number, target: number = TARGET_TRIAL_END_UNIX): boolean {
  return Number.isFinite(trialEnd) && Math.abs(trialEnd - target) <= 24 * 3600;
}

export interface CronDeps {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  fetchImpl: typeof fetch;
  nowMs: number;
  enabled: boolean;
  targetDate?: string;
  dryRun?: boolean;
  resendKey: string;
  stripeKey: string;
  from: string;
  replyTo: string;
  logEvent: (event: string, opts: { userId?: string | null; props?: Record<string, unknown>; sport?: string | null; source?: string }) => Promise<void>;
}
export interface CronResult {
  enabled: boolean; window: string; dryRun: boolean; candidates: number;
  sent: number; wouldSend: number; skipped: Record<string, number>; errors: string[];
}

export async function runPrerenewalCron(d: CronDeps): Promise<CronResult> {
  const skipped: Record<string, number> = {};
  const skip = (k: string) => { skipped[k] = (skipped[k] ?? 0) + 1; };
  const res: CronResult = { enabled: d.enabled, window: "closed", dryRun: !!d.dryRun, candidates: 0, sent: 0, wouldSend: 0, skipped, errors: [] };
  if (!d.enabled) { res.window = "flag_off"; return res; }
  const win = sendWindow(etDate(d.nowMs), d.targetDate ?? DEFAULT_TARGET_DATE);
  if (!win.open) { res.window = win.reason; return res; }
  res.window = "open";
  if (!d.stripeKey || !d.resendKey) { res.errors.push("missing_stripe_or_resend_key"); return res; }

  const { data: users, error: uErr } = await d.supabase
    .from("users")
    .select("id, email, full_name, base_status, base_stripe_subscription_id, base_cancel_at_period_end, base_cancel_at, base_canceled_at")
    .eq("base_status", "active")
    .not("base_stripe_subscription_id", "is", null)
    .limit(MAX_USERS);
  if (uErr) { res.errors.push(`users_query: ${uErr.message ?? "error"}`); return res; }
  res.candidates = (users ?? []).length;

  for (const u of (users ?? []) as Array<Record<string, unknown>>) {
    const userId = u.id as string;
    const email = u.email as string | null;
    if (!email) { skip("no_email"); continue; }
    // cheap DB-side skips first (no Stripe call)
    if (u.base_cancel_at_period_end === true || u.base_cancel_at || u.base_canceled_at) { skip("cancel_scheduled_or_canceled"); continue; }
    const { data: isTest } = await d.supabase.rpc("is_test_account", { p_email: email });
    if (isTest === true) { skip("test_fixture"); continue; }
    const { data: prior } = await d.supabase.from("email_sends").select("user_id").eq("user_id", userId).eq("email_id", PREREMINDER_EMAIL_ID).maybeSingle();
    if (prior) { skip("already_sent"); continue; }

    let sub: Record<string, unknown>;
    try {
      const r = await d.fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(String(u.base_stripe_subscription_id))}`, {
        headers: { Authorization: `Bearer ${d.stripeKey}` },
      });
      if (!r.ok) { res.errors.push(`stripe_${r.status}`); skip("stripe_error"); continue; }
      sub = await r.json();
    } catch (_e) { res.errors.push("stripe_fetch_threw"); skip("stripe_error"); continue; }

    const dec = decideReminder(sub, d.nowMs);
    if (!dec.send) { skip(dec.reason); continue; }
    if (dec.userId !== userId) { skip("metadata_user_mismatch"); continue; }
    if (!trialEndMatches(dec.trialEnd)) { skip("trial_end_not_target"); continue; }
    if (d.dryRun) { res.wouldSend++; continue; }

    const { error: claimErr } = await d.supabase.from("email_sends").insert({ user_id: userId, email_id: PREREMINDER_EMAIL_ID });
    if (claimErr) { skip("already_claimed"); continue; }
    const key = `${PREREMINDER_EMAIL_ID}-${userId}`;
    let ok = false;
    let resendId: string | null = null;
    try {
      const r = await d.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${d.resendKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          from: d.from, to: [email], reply_to: d.replyTo,
          subject: reminderSubject(dec.trialEnd),
          html: reminderHtml(dec.trialEnd, dec.basePrice, dec.sportPack, dec.sportPrice),
          text: reminderText(dec.trialEnd, dec.basePrice, dec.sportPack, dec.sportPrice),
          headers: { "X-Entity-Ref-ID": key },
          tags: [{ name: "email_id", value: PREREMINDER_EMAIL_ID }, { name: "type", value: "transactional" }, { name: "via", value: "cron" }],
        }),
      });
      ok = r.ok;
      if (ok) resendId = ((await r.json().catch(() => ({}))) as { id?: string }).id ?? null;
    } catch (_e) { ok = false; }
    if (!ok) {
      await d.supabase.from("email_sends").delete().eq("user_id", userId).eq("email_id", PREREMINDER_EMAIL_ID);
      res.errors.push("resend_error");
      skip("resend_error");
      continue;
    }
    res.sent++;
    await d.logEvent("email_sent", { userId, sport: "general", source: "cron", props: { email_id: PREREMINDER_EMAIL_ID, template_version: PREREMINDER_COPY_VERSION, resend_id: resendId, via: "cron" } });
  }
  return res;
}
