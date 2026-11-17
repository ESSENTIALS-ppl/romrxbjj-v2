// P1-17 day 3 ROMBot check-in: pure rules (no I/O), so every rule is testable without a network.
// Spec (behavior only, not words): /workspace/research/base-comp-20261115/reid/ROMBOT-DAY3-SPEC.md sections 2, 3, 6, 7.
// Grant's rulings (Nov 16, 2026): send time = notification_preferences.reminder_time if set, else 9:00 AM; zone = the stored
// timezone (the client saves the device zone there), else America/New_York. The email fallback goes out ONLY on a plan day,
// at the reminder time, ONLY to P1-01 opt-ins (the same consent and opt-out settings lifecycle-emails honors); otherwise the
// email is skipped and the in-app note is kept. Replies go to ai-chat, whose crisis route (live v96) is unchanged here.
// Grant Q3 (Nov 16, 9:49 AM ET): the email is never in the note's run; it goes in the first run at least 24 h after the note,
// at the same send hour, on a plan day, only with no app activity since the note (planEmails). Q4: the note itself goes to
// every eligible Base user whatever their email opt-in (plan).
import { type Branch, type Fill, render, renderEmail, type Rendered } from "./copy.ts";

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
/** The user's check-in note already written by an earlier run: the ai_conversations row with context_snapshot.kind
 *  "checkin_d3" (created_at = when the note was written). Existing data only; no new table or column. */
export interface NoteRecord { assessment_id: string; branch: Branch | null; at: string; }
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
  /** Newest ai_messages.created_at with role 'user' (any chat), or null. */
  last_user_message_at: string | null;
  /** user_mobility_schedule.next_check_at (P1-07), or null when the row or table is absent. */
  next_check_at: string | null;
  /** Email phase only (optional so note-phase callers need not set them). */
  note?: NoteRecord | null;
  /** email_sends already has checkin-d3-email-<assessment id> for this note. */
  email_already?: boolean;
  /** Newest protocol_sessions.logged_at (any), and newest assessments.assessed_at of ANY kind (full or quick). */
  last_session_at?: string | null;
  last_any_assessment_at?: string | null;
}

export type SkipReason =
  | "not_audience" | "not_base_active" | "test_account" | "deletion_requested" | "no_assessment" | "not_first_assessment"
  | "red_flag" | "no_plan" | "outside_send_window" | "not_day3" | "recent_rombot_message" | "branch_c_recent_session"
  | "no_next_check";
export type EmailSkip =
  // permanent (this note never gets an email)
  | "not_opted_in" | "marketing_opt_out" | "no_email" | "not_base_brand" | "email_already" | "note_stale" | "email_expired"
  | "activity_session" | "activity_assessment" | "activity_rombot_message" | "branch_changed"
  | "not_audience" | "not_base_active" | "test_account" | "deletion_requested" | "red_flag" | "no_plan" | "no_next_check"
  // wait (a later run may send it)
  | "too_soon" | "outside_send_window" | "not_plan_day";

/** One note per assessment, ever (claim checkin-d3-<assessment id> in email_sends). */
export interface PlannedNote {
  user_id: string; assessment_id: string; branch: Branch; rendered: Rendered;
  note_id: string; local_date: string; send: SendTime;
}
/** At most one email per note (claim checkin-d3-email-<assessment id>). */
export interface PlannedEmail {
  user_id: string; assessment_id: string; branch: Branch; rendered: Rendered;
  email_id: string; email: string; local_date: string; send: SendTime; note_age_hours: number;
}

/** Q3 (Grant, Nov 16): the email waits at least this long after the in-app note. */
export const EMAIL_MIN_WAIT_HOURS = 24;
/** Last moment an email may follow its note. 72 h after a day-3 note is local day 6, before the day-7 check (P1-08), so the
 *  fallback never lands on top of the next check email. After this the note stays in-app only. */
export const EMAIL_MAX_WAIT_HOURS = 72;

/** P1-01 consent: the Plan day reminders toggle is on AND carries the explicit opt-in marker (set only by set_reminder_opt_in).
 *  Same rule as lifecycle-emails explicitOn(pref, "protocol"); a test pins the two equal. */
export function protocolOptedIn(p: Pref | null): boolean {
  if (!p || p.email_reminders !== true) return false;
  const m = p.protocol_opt_in_at;
  return typeof m === "string" && Number.isFinite(Date.parse(m));
}
export function isPlanDay(dow: number, days: readonly number[] = PLAN_DAYS): boolean { return days.includes(dow); }
export function isBaseBrand(sport: string | null | undefined): boolean { return sport !== "bjj" && sport !== "bodybuilding"; }

type Opts = { all: boolean; canary: ReadonlySet<string>; planDays?: readonly number[] };
type Gate = SkipReason & EmailSkip;
function commonGate(c: Candidate, opts: Opts): Gate | null {
  if (!opts.all && !opts.canary.has(c.user_id.toLowerCase())) return "not_audience";
  if (c.base_status !== "active") return "not_base_active";
  if (c.is_test) return "test_account";
  if (c.deletion_requested) return "deletion_requested";
  return null;
}
/** Branch and words for `now`: n = sessions since the assessment; {today_area} for the user's local weekday NOW (for an email,
 *  the send day, never the note's day: Stacy 9d8fe291). `email` picks the email words (EMAIL_COPY) instead of the note's. */
function renderFor(c: Candidate, now: Date, st: SendTime, lp: { date: string; dow: number }, assessedAt: number, email = false):
  { branch: Branch; rendered: Rendered; newestSession: number } | "no_plan" | "no_next_check" {
  const area = todayArea(c.ranked_joint_keys, lp.dow);
  if (!area) return "no_plan";
  const sessions = c.sessions_since.filter((s) => Number.isFinite(Date.parse(s)) && Date.parse(s) >= assessedAt);
  const n = sessions.length;
  const branch = branchFor(n);
  let nextCheck: string | null = null;
  if (branch === "C") {
    // One source with lifecycle-emails (W1): next_check_at only, no 7-day or 42-day math. Never a past date.
    const nc = c.next_check_at && Number.isFinite(Date.parse(c.next_check_at)) ? c.next_check_at : null;
    if (!nc || localParts(new Date(Date.parse(nc)), st.tz).date <= lp.date) return "no_next_check";
    nextCheck = shortDate(nc, st.tz);
    if (!nextCheck) return "no_next_check";
  }
  const f: Fill = { first_name: firstName(c.full_name), today_area: area, n, next_check_date: nextCheck };
  return { branch, rendered: email ? renderEmail(branch, f) : render(branch, f), newestSession: n ? Math.max(...sessions.map((s) => Date.parse(s))) : NaN };
}

/** Note phase: the in-app note goes to EVERY eligible Base user on local day 3 at their send hour, whatever their email
 *  opt-in (Grant Q4, Nov 16). No email is sent in this phase. */
export function plan(now: Date, cands: Candidate[], opts: Opts) {
  const due: PlannedNote[] = [];
  const skipped: Partial<Record<SkipReason, number>> = {};
  const skip = (r: SkipReason) => { skipped[r] = (skipped[r] ?? 0) + 1; };
  for (const c of cands) {
    const g = commonGate(c, opts);
    if (g) { skip(g); continue; }
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
    const lastMsg = c.last_user_message_at ? Date.parse(c.last_user_message_at) : NaN;
    if (Number.isFinite(lastMsg) && now.getTime() - lastMsg < RECENT_ROMBOT_MESSAGE_HOURS * 3600000) { skip("recent_rombot_message"); continue; }
    const r = renderFor(c, now, st, lp, at);
    if (typeof r === "string") { skip(r); continue; }
    if (r.branch === "C" && now.getTime() - r.newestSession < BRANCH_C_RECENT_SESSION_HOURS * 3600000) { skip("branch_c_recent_session"); continue; }
    due.push({ user_id: c.user_id, assessment_id: a.id, branch: r.branch, rendered: r.rendered, note_id: `checkin-d3-${a.id}`, local_date: lp.date, send: st });
  }
  return { due, skipped };
}

const after = (iso: string | null | undefined, t: number) => !!iso && Number.isFinite(Date.parse(iso)) && Date.parse(iso) > t;

/** Email phase (Grant Q3, Nov 16): the email fallback goes in the FIRST run at least 24 h after the note was written, at the
 *  user's send hour (same rule as the note), on a plan day, and ONLY if there has been no app activity since the note:
 *  no session save, no assessment (full or quick), no ROMBot message. Every other gate stays (P1-01 opt-in, marketing
 *  opt-out, Base brand; LIFECYCLE_EMAILS_SEND is checked by the handler). Wait reasons (too_soon, outside_send_window,
 *  not_plan_day) let a later run send; the window closes EMAIL_MAX_WAIT_HOURS after the note. */
export function planEmails(now: Date, cands: Candidate[], opts: Opts) {
  const due: PlannedEmail[] = [];
  const skipped: Partial<Record<EmailSkip, number>> = {};
  const skip = (r: EmailSkip) => { skipped[r] = (skipped[r] ?? 0) + 1; };
  for (const c of cands) {
    const note = c.note;
    if (!note) continue; // no note yet: nothing to follow up
    const g = commonGate(c, opts);
    if (g) { skip(g); continue; }
    if (c.email_already) { skip("email_already"); continue; }
    const noteAt = Date.parse(note.at);
    if (!Number.isFinite(noteAt)) { skip("note_stale"); continue; }
    const ageH = (now.getTime() - noteAt) / 3600000;
    if (ageH > EMAIL_MAX_WAIT_HOURS) { skip("email_expired"); continue; }
    // Activity since the note, from data already recorded (no new open signal).
    if (after(c.last_session_at, noteAt) || c.sessions_since.some((s) => after(s, noteAt))) { skip("activity_session"); continue; }
    if (after(c.last_any_assessment_at, noteAt) || c.full_assessments.some((x) => after(x.assessed_at, noteAt))) { skip("activity_assessment"); continue; }
    if (after(c.last_user_message_at, noteAt)) { skip("activity_rombot_message"); continue; }
    const a = c.full_assessments[0];
    if (!a || a.id !== note.assessment_id) { skip("note_stale"); continue; }
    if (a.red_flag_triggered === true) { skip("red_flag"); continue; }
    if (!protocolOptedIn(c.pref)) { skip("not_opted_in"); continue; }
    if (c.marketing_opt_out === true) { skip("marketing_opt_out"); continue; }
    if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { skip("no_email"); continue; }
    if (!isBaseBrand(c.active_sport)) { skip("not_base_brand"); continue; }
    if (ageH < EMAIL_MIN_WAIT_HOURS) { skip("too_soon"); continue; }
    const st = sendTime(c.pref);
    const lp = localParts(now, st.tz);
    if (!inWindow(lp.hour, st.hour)) { skip("outside_send_window"); continue; }
    if (!isPlanDay(lp.dow, opts.planDays ?? PLAN_DAYS)) { skip("not_plan_day"); continue; }
    const r = renderFor(c, now, st, lp, Date.parse(a.assessed_at), true);
    if (typeof r === "string") { skip(r); continue; }
    if (note.branch && note.branch !== r.branch) { skip("branch_changed"); continue; }
    due.push({ user_id: c.user_id, assessment_id: a.id, branch: r.branch, rendered: r.rendered, email_id: `checkin-d3-email-${a.id}`, email: c.email, local_date: lp.date, send: st, note_age_hours: Math.round(ageH * 100) / 100 });
  }
  return { due, skipped };
}

/** In-app message text: Stacy's first and last lines. The button is carried in context_snapshot for the client to draw. */
export function noteContent(r: Rendered): string { return `${r.line1}\n${r.line3}`; }
export const APP_PATH = "/dashboard/my-protocol?src=checkin-d3";

export function maskEmail(e: string): string {
  const [l, d] = e.split("@");
  return `${(l ?? "").slice(0, 1)}***@${d ?? ""}`;
}
