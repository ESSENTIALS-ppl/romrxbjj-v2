// P1-17 day 3 ROMBot check-in: pure rules (no I/O), so every rule is testable without a network.
// Spec (behavior only, not words): /workspace/research/base-comp-20261115/reid/ROMBOT-DAY3-SPEC.md sections 2, 3, 6, 7.
// Grant's rulings (Nov 16, 2026): send time = notification_preferences.reminder_time if set, else 9:00 AM; zone = the stored
// timezone (the client saves the device zone there), else America/New_York. The email fallback goes out ONLY on a plan day,
// at the reminder time, ONLY to P1-01 opt-ins (the same consent and opt-out settings lifecycle-emails honors); otherwise the
// email is skipped and the in-app note is kept. Replies go to ai-chat, whose crisis route (live v96) is unchanged here.
import { type Branch, type Fill, render, type Rendered } from "./copy.ts";

/** P1-17 default send hour (Grant 9:28 AM ET Nov 16, overriding the spec's 7:00). Used ONLY when reminder_time is empty or unreadable. */
export const DEFAULT_HOUR = 9;
/** P1-17 fallback zone when no valid stored timezone exists. */
export const DEFAULT_TZ = "America/New_York";
/** Eligible from the send hour until this many hours later, so one failed hourly run is retried (same as lifecycle-emails). */
export const SEND_WINDOW_HOURS = 3;
/** The check-in goes on the user's local calendar day = assessment local date + 3. */
export const CHECKIN_DAY = 3;
/** Plan days. Mirrors lifecycle-emails PROTOCOL_DAYS (every weekday has a protocol in the apps; MyProtocol ROTATION covers 0 to 6).
 *  A test pins this equal to lifecycle-emails, so the plan-day rule stays one rule. */
export const PLAN_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
/** MyProtocol.tsx ROTATION (romrx-io-web): weekday -> index into the user's ranked focus list. */
export const ROTATION: Readonly<Record<number, number>> = { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2, 0: 0 };
/** Plain body part names for {today_area} (spec section 3: body part names only, no degrees, scores or bands).
 *  Keyed by joint family (protocols.joint_key prefix). Unknown family = no message (fail closed). */
export const AREA_BY_FAMILY: Readonly<Record<string, string>> = {
  hip: "hips", shoulder: "shoulders", cervical: "neck", ankle: "ankles",
};
/** Stop rules (spec section 7). */
export const BRANCH_C_RECENT_SESSION_HOURS = 12;
export const RECENT_ROMBOT_MESSAGE_HOURS = 24;

export function flagOn(v: string | null | undefined): boolean { return v === "on"; }

export function validTz(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
/** reminder_time text such as "07:00", "7:00", "08:30:00" or "8:30 AM". Returns null when empty or unreadable. */
export function parseReminderHour(t: string | null | undefined): number | null {
  if (t === null || t === undefined || typeof t !== "string" || t.trim() === "") return null;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(t);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toLowerCase();
  if (ap) { if (h < 1 || h > 12) return null; if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; }
  if (h < 0 || h > 23) return null;
  return h;
}

export interface SendTime { hour: number; tz: string; hourSource: "reminder_time" | "default_9"; tzSource: "stored" | "default_ny"; }
/** Send-time fallback order (Grant): 1) reminder_time if set; 2) else 9:00. Zone: stored timezone if valid, else America/New_York. */
export function sendTime(pref: { reminder_time?: string | null; timezone?: string | null } | null | undefined): SendTime {
  const h = parseReminderHour(pref?.reminder_time ?? null);
  const tzOk = validTz(pref?.timezone ?? null);
  return {
    hour: h ?? DEFAULT_HOUR, hourSource: h === null ? "default_9" : "reminder_time",
    tz: tzOk ? pref!.timezone! : DEFAULT_TZ, tzSource: tzOk ? "stored" : "default_ny",
  };
}

export function localParts(now: Date, tz: string): { date: string; hour: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: parseInt(g("hour"), 10) % 24, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")) };
}
export function inWindow(localHour: number, targetHour: number): boolean {
  const d = (localHour - targetHour + 24) % 24;
  return d >= 0 && d < SEND_WINDOW_HOURS;
}
export function ymdAdd(date: string, days: number): string {
  const [y, m, d] = date.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
/** Stacy's date format for {next_check_date}: "Monday, Dec 28". */
export function shortDate(iso: string | null | undefined, tz: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).formatToParts(new Date(t));
  const g = (x: string) => parts.find((p) => p.type === x)?.value ?? "";
  if (!g("weekday") || !g("month") || !g("day")) return null;
  return `${g("weekday")}, ${g("month")} ${g("day")}`;
}

/** First name: first word of users.full_name, else no name (spec section 3). Only plain name characters are used, because
 *  ROMBot.tsx renders message lines as HTML; anything else (an email, digits, markup) gives the no-name copy. */
export function firstName(full: string | null | undefined): string | null {
  const f = (full ?? "").trim().split(/\s+/)[0] ?? "";
  return /^\p{L}[\p{L}'.-]{0,39}$/u.test(f) ? f : null;
}

export function branchFor(n: number): Branch { return n <= 0 ? "A" : n <= 2 ? "B" : "C"; }

/** {today_area}: the user's ranked focus list (protocols for the assessment, priority_rank ascending), picked like MyProtocol's
 *  TodayCard: ranked[min(ROTATION[dow], len - 1)]. Returns null when it cannot be named. */
export function todayArea(rankedJointKeys: string[], dow: number): string | null {
  if (!rankedJointKeys.length || !(dow in ROTATION)) return null;
  const key = rankedJointKeys[Math.min(ROTATION[dow], rankedJointKeys.length - 1)];
  const fam = (key ?? "").split("_")[0];
  return AREA_BY_FAMILY[fam] ?? null;
}

export interface Pref {
  reminder_time: string | null; timezone: string | null;
  email_reminders: boolean | null; protocol_opt_in_at: string | null;
}
export interface Candidate {
  user_id: string;
  email: string | null;
  full_name: string | null;
  active_sport: string | null;
  base_status: string | null;
  marketing_opt_out: boolean | null;
  is_test: boolean;
  deletion_requested: boolean;
  pref: Pref | null;
  /** Full assessments only (quick re-checks excluded when check_kind exists), newest first. */
  full_assessments: { id: string; assessed_at: string; red_flag_triggered: boolean | null }[];
  /** protocols.joint_key for the newest assessment, priority_rank ascending. */
  ranked_joint_keys: string[];
  /** protocol_sessions.logged_at values at or after the assessment. */
  sessions_since: string[];
  /** Newest ai_messages.created_at with role 'user', or null. */
  last_user_message_at: string | null;
  /** user_mobility_schedule.next_check_at (P1-07), or null when the row or table is absent. */
  next_check_at: string | null;
}

export type SkipReason =
  | "not_audience" | "not_base_active" | "test_account" | "deletion_requested" | "no_assessment" | "not_first_assessment"
  | "red_flag" | "no_plan" | "outside_send_window" | "not_day3" | "recent_rombot_message" | "branch_c_recent_session"
  | "no_next_check";
export type EmailSkip =
  | "not_opted_in" | "marketing_opt_out" | "no_email" | "not_plan_day" | "not_base_brand";

export interface Planned {
  user_id: string; assessment_id: string; branch: Branch; rendered: Rendered;
  /** Claim ids in email_sends (unique on user_id, email_id). One in-app note and at most one email per assessment, ever. */
  note_id: string; email_id: string;
  /** null = the email fallback goes out with the note; otherwise why it is skipped (the in-app note is kept). */
  email_skip: EmailSkip | null;
  email: string | null;
  local_date: string; send: SendTime;
}

/** P1-01 consent: the Plan day reminders toggle is on AND carries the explicit opt-in marker (set only by set_reminder_opt_in).
 *  Same rule as lifecycle-emails explicitOn(pref, "protocol"); a test pins the two equal. */
export function protocolOptedIn(p: Pref | null): boolean {
  if (!p || p.email_reminders !== true) return false;
  const m = p.protocol_opt_in_at;
  return typeof m === "string" && Number.isFinite(Date.parse(m));
}
export function isPlanDay(dow: number, days: readonly number[] = PLAN_DAYS): boolean { return days.includes(dow); }
export function isBaseBrand(sport: string | null | undefined): boolean { return sport !== "bjj" && sport !== "bodybuilding"; }

export function plan(now: Date, cands: Candidate[], opts: { all: boolean; canary: ReadonlySet<string>; planDays?: readonly number[] }) {
  const due: Planned[] = [];
  const skipped: Partial<Record<SkipReason, number>> = {};
  const emailSkipped: Partial<Record<EmailSkip, number>> = {};
  const skip = (r: SkipReason) => { skipped[r] = (skipped[r] ?? 0) + 1; };
  for (const c of cands) {
    if (!opts.all && !opts.canary.has(c.user_id.toLowerCase())) { skip("not_audience"); continue; }
    if (c.base_status !== "active") { skip("not_base_active"); continue; }
    if (c.is_test) { skip("test_account"); continue; }
    if (c.deletion_requested) { skip("deletion_requested"); continue; }
    const a = c.full_assessments[0];
    if (!a) { skip("no_assessment"); continue; }
    if (c.full_assessments.length !== 1) { skip("not_first_assessment"); continue; }
    if (a.red_flag_triggered === true) { skip("red_flag"); continue; }
    const st = sendTime(c.pref);
    const lp = localParts(now, st.tz);
    const at = Date.parse(a.assessed_at);
    if (!Number.isFinite(at)) { skip("no_assessment"); continue; }
    if (lp.date !== ymdAdd(localParts(new Date(at), st.tz).date, CHECKIN_DAY)) { skip("not_day3"); continue; }
    if (!inWindow(lp.hour, st.hour)) { skip("outside_send_window"); continue; }
    const area = todayArea(c.ranked_joint_keys, lp.dow);
    if (!area) { skip("no_plan"); continue; }
    const lastMsg = c.last_user_message_at ? Date.parse(c.last_user_message_at) : NaN;
    if (Number.isFinite(lastMsg) && now.getTime() - lastMsg < RECENT_ROMBOT_MESSAGE_HOURS * 3600000) { skip("recent_rombot_message"); continue; }
    const sessions = c.sessions_since.filter((s) => Number.isFinite(Date.parse(s)) && Date.parse(s) >= at);
    const n = sessions.length;
    const branch = branchFor(n);
    let nextCheck: string | null = null;
    if (branch === "C") {
      const newest = Math.max(...sessions.map((s) => Date.parse(s)));
      if (now.getTime() - newest < BRANCH_C_RECENT_SESSION_HOURS * 3600000) { skip("branch_c_recent_session"); continue; }
      // One source with lifecycle-emails (W1): next_check_at only, no 7-day or 42-day math. Never a past date.
      const nc = c.next_check_at && Number.isFinite(Date.parse(c.next_check_at)) ? c.next_check_at : null;
      if (!nc || localParts(new Date(Date.parse(nc)), st.tz).date <= lp.date) { skip("no_next_check"); continue; }
      nextCheck = shortDate(nc, st.tz);
      if (!nextCheck) { skip("no_next_check"); continue; }
    }
    const f: Fill = { first_name: firstName(c.full_name), today_area: area, n, next_check_date: nextCheck };
    const rendered = render(branch, f);
    let email_skip: EmailSkip | null = null;
    if (!protocolOptedIn(c.pref)) email_skip = "not_opted_in";
    else if (c.marketing_opt_out === true) email_skip = "marketing_opt_out";
    else if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) email_skip = "no_email";
    else if (!isPlanDay(lp.dow, opts.planDays ?? PLAN_DAYS)) email_skip = "not_plan_day";
    else if (!isBaseBrand(c.active_sport)) email_skip = "not_base_brand";
    if (email_skip) emailSkipped[email_skip] = (emailSkipped[email_skip] ?? 0) + 1;
    due.push({
      user_id: c.user_id, assessment_id: a.id, branch, rendered,
      note_id: `checkin-d3-${a.id}`, email_id: `checkin-d3-email-${a.id}`,
      email_skip, email: email_skip ? null : c.email, local_date: lp.date, send: st,
    });
  }
  return { due, skipped, emailSkipped };
}

/** In-app message text: Stacy's first and last lines. The button is carried in context_snapshot for the client to draw. */
export function noteContent(r: Rendered): string { return `${r.line1}\n${r.line3}`; }
export const APP_PATH = "/dashboard/my-protocol?src=checkin-d3";

export function maskEmail(e: string): string {
  const [l, d] = e.split("@");
  return `${(l ?? "").slice(0, 1)}***@${d ?? ""}`;
}
