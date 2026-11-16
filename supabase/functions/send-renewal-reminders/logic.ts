// send-renewal-reminders v5 pure logic (no I/O) so it can be unit tested and used for read-only dry runs.
// v5 fix (2026-10-26): v4 only read public.users.subscription_expiry (legacy pack plan), which is empty for every
// active account, so no Base reminder would ever go out. Base billing state lives on public.users:
// base_status, base_stripe_subscription_id, base_expiry, base_cancel_at_period_end, base_canceled_at.
// The Base charge date is the Stripe trial_end recorded in public.billing_consents (Jan 1, 2027 noon ET for beta
// checkouts); base_expiry (Stripe current_period_end) is the fallback.

export type ReminderType = "45_day" | "30_day" | "2_day";
export const REMINDER_WINDOWS: { type: ReminderType; days: number; label: string }[] = [
  { type: "45_day", days: 45, label: "45 days" },
  { type: "30_day", days: 30, label: "30 days" },
  { type: "2_day", days: 2, label: "2 days" },
];

export interface CandidateRow {
  id: string;
  email: string;
  full_name: string | null;
  active_sport: string | null;
  base_status: string | null;
  base_stripe_subscription_id: string | null;
  base_expiry: string | null;
  base_cancel_at_period_end: boolean | null;
  base_canceled_at: string | null;
  // v6 (FG-35): legacy markers. Any one of them means a legacy pack user, who is NEVER sent a Base renewal reminder.
  grandfathered_at?: string | null;
  subscription_tier?: string | null; // legacy pack tier: athlete / coach
  subscription_expiry?: string | null; // legacy pack expiry
  stripe_subscription_id?: string | null; // legacy pack Stripe subscription
  is_test: boolean; // public.is_test_account(email)
  consents: { stripe_subscription_id: string | null; trial_end: string | null; amounts: number[] | null; offer: string }[];
}

export interface Reminder {
  user_id: string;
  email: string;
  full_name: string | null;
  active_sport: string | null;
  type: ReminderType;
  label: string;
  days_until: number;
  charge_at: string; // ISO instant
  charge_date: string; // YYYY-MM-DD in America/New_York; stored in renewal_reminders.subscription_expiry
  amount_cents: number;
}

export const BASE_AMOUNT_CENTS = 6000; // locked Legal terms: $60 per year

/** Internal accounts never get reminders even if not flagged as fixtures. */
export function isInternal(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith("@romrx.io") || e.endsWith("@romrxbjj.com") || e.endsWith("@romrxbodybuilding.com");
}

/** Calendar date in America/New_York. */
export function nyDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function dayDiff(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);
}

/** Smallest window that still covers daysUntil (catches up a missed cron day, never sends two at once). */
export function windowFor(daysUntil: number) {
  if (daysUntil < 0) return null;
  const sorted = [...REMINDER_WINDOWS].sort((a, b) => a.days - b.days);
  for (let i = 0; i < sorted.length; i++) {
    const lowerExclusive = i === 0 ? -1 : sorted[i - 1].days;
    if (daysUntil <= sorted[i].days && daysUntil > lowerExclusive) return sorted[i];
  }
  return null; // more than 45 days out
}

/** Base charge instant: latest future trial_end on a consent for this subscription, else base_expiry. */
export function chargeAt(row: CandidateRow, now: Date): { at: string; amount: number } | null {
  const mine = row.consents.filter((c) => c.stripe_subscription_id && c.stripe_subscription_id === row.base_stripe_subscription_id && c.offer !== "sport");
  const trial = mine.filter((c) => c.trial_end && Date.parse(c.trial_end) > now.getTime())
    .sort((a, b) => Date.parse(b.trial_end!) - Date.parse(a.trial_end!))[0];
  const amount = (trial ?? mine[0])?.amounts?.[0] ?? BASE_AMOUNT_CENTS;
  if (trial) return { at: new Date(trial.trial_end!).toISOString(), amount };
  if (row.base_expiry && Date.parse(row.base_expiry) > now.getTime()) return { at: new Date(row.base_expiry).toISOString(), amount };
  return null;
}

/** v6 (FG-35): explicit legacy check. Does not rely on base_expiry or any date being null. */
export function legacyReason(row: CandidateRow): string | null {
  if (row.grandfathered_at) return "legacy_grandfathered";
  const tier = String(row.subscription_tier ?? "").toLowerCase();
  if (tier === "athlete" || tier === "coach") return "legacy_tier";
  if (row.subscription_expiry) return "legacy_pack_expiry";
  if (row.stripe_subscription_id) return "legacy_pack_subscription";
  return null;
}

export function eligible(row: CandidateRow): string | null {
  const legacy = legacyReason(row);
  if (legacy) return legacy; // checked first, before any Base field
  if (row.base_status !== "active") return "base_not_active";
  if (!row.base_stripe_subscription_id) return "no_stripe_subscription"; // nothing will be charged
  if (row.base_cancel_at_period_end || row.base_canceled_at) return "canceling";
  if (row.is_test) return "test_fixture";
  if (isInternal(row.email)) return "internal";
  return null;
}

export function planReminders(rows: CandidateRow[], now: Date): { due: Reminder[]; skipped: Record<string, number> } {
  const due: Reminder[] = [];
  const skipped: Record<string, number> = {};
  const today = nyDate(now);
  for (const r of rows) {
    const why = eligible(r);
    if (why) { skipped[why] = (skipped[why] ?? 0) + 1; continue; }
    const c = chargeAt(r, now);
    if (!c) { skipped.no_future_charge_date = (skipped.no_future_charge_date ?? 0) + 1; continue; }
    const chargeDate = nyDate(new Date(c.at));
    const daysUntil = dayDiff(today, chargeDate);
    const w = windowFor(daysUntil);
    if (!w) { skipped.not_in_window = (skipped.not_in_window ?? 0) + 1; continue; }
    due.push({ user_id: r.id, email: r.email, full_name: r.full_name, active_sport: r.active_sport, type: w.type, label: w.label,
      days_until: daysUntil, charge_at: c.at, charge_date: chargeDate, amount_cents: c.amount });
  }
  return { due, skipped };
}

export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}***@${d ?? ""}`;
}

export function formatUsdYear(cents: number): string {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}/yr`;
}

/** Fail-safe flag reader (Grant Nov 2 2026): sends are ON only when RENEWAL_BASE_SEND is exactly the lowercase string "on". Unset, "", "ON", "true", "1" are OFF. */
export function sendEnabled(v: string | undefined | null): boolean { return v === "on"; }
