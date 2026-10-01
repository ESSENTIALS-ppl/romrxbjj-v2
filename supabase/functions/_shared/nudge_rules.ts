// _shared/nudge_rules.ts - pure decision rules for the incomplete-assessment nudge (DRAFT, not deployed).
// No I/O here so every rule is unit-tested (nudge_rules_test.ts). Stacy ruling 2026-10-02:
//   max 2 emails per person, A at ~T+2h, B ~24h after A, stop on completion or unsubscribe,
//   skip marketing_opt_out, skip EU/UK, one catch-up email for the pre-launch stalled backlog,
//   quiet hours 9pm to 8am local, never send to test accounts or audit fixtures in live mode.

export type Stage = "incomplete_a" | "incomplete_b" | "incomplete_catchup";

export const MAX_EMAILS_PER_PERSON = 2;
export const QUIET_START_HOUR = 21; // 9pm local
export const QUIET_END_HOUR = 8; // 8am local
export const A_MIN_AGE_H = 2;
export const A_MAX_AGE_H = 20; // A is skipped if we missed the window; B still follows 24h after A only if A sent
export const B_AFTER_A_H = 24;
export const B_MAX_AFTER_A_H = 72; // do not send a stale B

export interface NudgeUser {
  id: string;
  email: string | null;
  createdAt: string; // ISO
  activeSport: string | null;
  marketingOptOut: boolean | null;
  emailReminders: boolean | null; // notification_preferences.email_reminders (null = no row)
  timezone: string | null;
  isTestAccount: boolean; // public.is_test_account(email)
  hasAssessment: boolean; // re-checked immediately before send
  nudgeSends: Array<{ emailId: string; sentAt: string }>; // from email_sends where email_id in Stage
}

export interface NudgeConfig {
  now: Date;
  abSince: Date | null; // users created at/after this get the A/B sequence; null = A/B disabled
  catchupEnabled: boolean; // one catch-up email for users created before abSince
  testOnly: boolean; // true: only allowlisted emails; false: never test accounts/fixtures
  testAllowlist: string[]; // lower-case emails, used only when testOnly
}

export type Decision = { send: true; stage: Stage } | { send: false; reason: string };

/** Audit/field fixtures (same patterns as send-conversion-drip isAuditFixtureEmail). */
export function isAuditFixtureEmail(email: string): boolean {
  const e = email.toLowerCase();
  return e.includes("+romrx-audit") || e.includes("+romrx-goa") || e.includes("+romrx-onboard") || e.startsWith("jim+romrx-");
}

/** EU/UK/EEA/CH by IANA zone. Unknown or missing zone is treated as unclear, which skips (Stacy: unclear = skip). */
export function isEuUkOrUnclearTz(tz: string | null | undefined): boolean {
  if (!tz) return true;
  return tz.startsWith("Europe/") || tz === "UTC" || tz === "GMT" || tz.startsWith("Etc/") || tz.startsWith("Atlantic/");
}

export function localHour(now: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return h === 24 ? 0 : h;
}

/** Quiet hours 9pm to 8am local: no send when hour >= 21 or hour < 8. */
export function inQuietHours(now: Date, tz: string): boolean {
  const h = localHour(now, tz);
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

const hoursBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 3_600_000;

export function decide(u: NudgeUser, cfg: NudgeConfig): Decision {
  const email = (u.email ?? "").toLowerCase().trim();
  if (!email) return { send: false, reason: "no_email" };
  if (u.hasAssessment) return { send: false, reason: "assessment_complete" };
  if (u.marketingOptOut) return { send: false, reason: "marketing_opt_out" };
  if (u.emailReminders === false) return { send: false, reason: "email_reminders_off" };

  if (cfg.testOnly) {
    if (!cfg.testAllowlist.includes(email)) return { send: false, reason: "test_mode_not_allowlisted" };
  } else {
    if (u.isTestAccount) return { send: false, reason: "test_account" };
    if (isAuditFixtureEmail(email)) return { send: false, reason: "audit_fixture" };
  }

  if ((u.activeSport ?? "general") !== "general") return { send: false, reason: "not_base_user" };
  if (isEuUkOrUnclearTz(u.timezone)) return { send: false, reason: "eu_uk_or_unclear_region" };
  const tz = u.timezone as string;
  if (inQuietHours(cfg.now, tz)) return { send: false, reason: "quiet_hours" };

  if (u.nudgeSends.length >= MAX_EMAILS_PER_PERSON) return { send: false, reason: "email_cap_reached" };
  const sent = new Map(u.nudgeSends.map((s) => [s.emailId, new Date(s.sentAt)]));
  const created = new Date(u.createdAt);
  const ageH = hoursBetween(cfg.now, created);

  // Backlog (created before abSince): ONE catch-up email, never A/B.
  const isBacklog = cfg.abSince ? created < cfg.abSince : true;
  if (isBacklog) {
    if (!cfg.catchupEnabled) return { send: false, reason: "catchup_disabled" };
    if (u.nudgeSends.length > 0) return { send: false, reason: "already_nudged" };
    if (ageH < 24) return { send: false, reason: "too_new_for_catchup" };
    return { send: true, stage: "incomplete_catchup" };
  }

  if (!cfg.abSince) return { send: false, reason: "ab_disabled" };
  if (sent.has("incomplete_catchup")) return { send: false, reason: "already_nudged" };
  const a = sent.get("incomplete_a");
  const b = sent.get("incomplete_b");
  if (!a) {
    if (ageH < A_MIN_AGE_H) return { send: false, reason: "a_not_due" };
    if (ageH > A_MAX_AGE_H) return { send: false, reason: "a_window_missed" };
    return { send: true, stage: "incomplete_a" };
  }
  if (b) return { send: false, reason: "sequence_done" };
  const sinceA = hoursBetween(cfg.now, a);
  if (sinceA < B_AFTER_A_H) return { send: false, reason: "b_not_due" };
  if (sinceA > B_MAX_AFTER_A_H) return { send: false, reason: "b_window_missed" };
  return { send: true, stage: "incomplete_b" };
}
