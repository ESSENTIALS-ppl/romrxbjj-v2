// lifecycle-emails logic (FG-09 retest, FG-10 protocol day, FG-11 weekly digest). Staged 2026-11-02, nothing deployed.
// Pure functions only, so every rule is testable without a network.
// Rules (Stacy's FG-09/10/11 checklist, 2026-11-02 17:43):
//  - Audience is EXPLICIT SAVED ON only: the toggle is true AND the row was saved by the user after it was created
//    (updated_at later than created_at). A default-on retest_reminders row nobody touched gets nothing.
//  - Sender re-reads the toggle at send time (the caller loads rows in the same run it sends).
//  - Send time follows reminder_time and timezone. A bad or missing value falls back to 09:00 America/Chicago.
//  - Nothing is sent to users with marketing_opt_out, with a pending deletion request, or with no email.
//  - No scores in reminders. The digest holds the overall score change and the streak count only.

export type Kind = "retest" | "protocol" | "digest" | "check7" | "check14";
export const KINDS: readonly Kind[] = ["retest", "protocol", "digest", "check7", "check14"];

/** Fail-safe flag rule: ON only when the value is exactly the lowercase string "on". */
export function flagOn(v: string | null | undefined): boolean { return v === "on"; }
/** Audience rule: everyone explicit-on only when LIFECYCLE_AUDIENCE is exactly "all"; anything else is canary (listed user ids only). */
export function audienceAll(v: string | null | undefined): boolean { return v === "all"; }

export const DEFAULT_TZ = "America/Chicago";
export const DEFAULT_HOUR = 9;
/** A user is eligible from their send hour until this many hours later, so one failed run is retried by the next hourly run. */
export const SEND_WINDOW_HOURS = 3;
export const RETEST_DAYS = 42;
/** Retest is sent once per assessment, between day 42 and day 48 after it. Older assessments are never swept at go-live. */
export const RETEST_GRACE_DAYS = 7;
/** P1-08: earlier check-in emails. One send per assessment, on the due local date plus one grace day. */
export const CHECK7_DAYS = 7;
export const CHECK14_DAYS = 14;
export const CHECK_GRACE_DAYS = 1;
/** Every day of the week has a protocol in the apps (MyProtocol ROTATION covers 0 to 6). Change here if Jim wants fewer days. */
export const PROTOCOL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
export const DIGEST_DOW = 0; // Sunday

export interface Pref {
  user_id: string; reminder_time: string | null; timezone: string | null;
  retest_reminders: boolean | null; email_reminders: boolean | null; weekly_digest: boolean | null;
  created_at: string | null; updated_at: string | null;
  /** Explicit opt-in markers. Set ONLY by public.set_reminder_opt_in() (a user turning that toggle on); never by a plain save, never by a default. */
  retest_opt_in_at?: string | null; protocol_opt_in_at?: string | null; digest_opt_in_at?: string | null;
}
export interface Candidate {
  user_id: string; email: string | null; full_name: string | null; active_sport: string | null;
  marketing_opt_out: boolean | null; deletion_requested: boolean;
  pref: Pref | null;
  latest_assessment: { id: string; assessed_at: string } | null;
  /** The apps' /100 score (score.ts appScore) of the newest assessment, or null. NOT rom_total. */
  latest_score: number | null;
  /** The same score for the assessment immediately BEFORE the newest one (what My Body compares against), or null if there is only one. */
  previous_score: number | null;
  /** session_date values (YYYY-MM-DD) from protocol_sessions, newest 60 or so. */
  session_dates: string[];
  has_protocol: boolean;
  /** P1-07 schedule, when the unapplied table exists. Missing row = fall back to latest_assessment. */
  schedule?: { last_assessment_id: string | null; last_assessed_at: string | null; next_retest_at: string | null; next_check_at: string | null } | null;
  /** True when a check_kind=quick assessment exists after the last full one, or the schedule has moved off day 7. */
  has_quick_check?: boolean;
}
export interface Due {
  kind: Kind; user_id: string; email: string; first_name: string; active_sport: string | null;
  email_id: string; // deterministic id used for the claim in email_sends
  digest?: { score: number; delta: number | null; streak: number };
  local_date: string;
  /** Formatted "Monday, December 28" (year only if not current), for Stacy P1-08/P1-16 copy. */
  retest_date?: string | null;
  next_check_date?: string | null;
  quick_check_done?: boolean;
}

const FIELD: Record<Kind, "retest_reminders" | "email_reminders" | "weekly_digest"> = {
  retest: "retest_reminders", protocol: "email_reminders", digest: "weekly_digest",
  check7: "retest_reminders", check14: "retest_reminders",
};

export function validTz(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
export function localParts(now: Date, tz: string | null | undefined): { date: string; hour: number; dow: number; tz: string } {
  const zone = validTz(tz) ? tz : DEFAULT_TZ;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: parseInt(g("hour"), 10) % 24, dow, tz: zone };
}
/** reminder_time is text such as "08:30" or "8:30 AM". Anything unparseable is 09 (never midnight by accident). */
export function reminderHour(t: string | null | undefined): number {
  if (!t) return DEFAULT_HOUR;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(t);
  if (!m) return DEFAULT_HOUR;
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toLowerCase();
  if (ap) { if (h < 1 || h > 12) return DEFAULT_HOUR; if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; }
  if (h < 0 || h > 23) return DEFAULT_HOUR;
  return h;
}
const MARKER: Record<Kind, "retest_opt_in_at" | "protocol_opt_in_at" | "digest_opt_in_at"> = {
  retest: "retest_opt_in_at", protocol: "protocol_opt_in_at", digest: "digest_opt_in_at",
  check7: "retest_opt_in_at", check14: "retest_opt_in_at",
};
/** True only for a toggle that is true AND carries an explicit opt-in marker (set only by set_reminder_opt_in when the user turned it on).
 *  A default-on row, a plain save of the form, or an old "touched" row has no marker and gets nothing. */
export function explicitOn(p: Pref | null, kind: Kind): boolean {
  if (!p || p[FIELD[kind]] !== true) return false;
  const m = p[MARKER[kind]];
  return typeof m === "string" && Number.isFinite(Date.parse(m));
}
function inWindow(localHour: number, targetHour: number): boolean {
  const d = (localHour - targetHour + 24) % 24;
  return d >= 0 && d < SEND_WINDOW_HOURS;
}
/** Streak of consecutive local days with a logged session, ending today or yesterday. */
export function streakDays(dates: string[], today: string): number {
  const set = new Set(dates);
  const prev = (d: string) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };
  let cur = set.has(today) ? today : prev(today);
  let n = 0;
  while (set.has(cur)) { n++; cur = prev(cur); }
  return n;
}
export function firstName(full: string | null | undefined, email: string): string {
  const f = (full ?? "").trim().split(/\s+/)[0] ?? "";
  return f.length > 0 && f.length <= 40 ? f : (email.split("@")[0] || "there");
}

export type SkipReason =
  | "not_canary" | "no_pref" | "toggle_off" | "not_explicit" | "marketing_opt_out" | "deletion_requested" | "no_email"
  | "outside_send_window" | "wrong_weekday" | "no_assessment" | "not_due" | "no_protocol" | "session_already_logged" | "no_score";


/** Calendar-day add on a YYYY-MM-DD string (UTC date arithmetic, no timezone shift). */
export function ymdAdd(date: string, days: number): string {
  const [y, m, d] = date.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
export function assessmentLocalDate(c: Candidate, tz: string | null | undefined): string | null {
  const iso = c.schedule?.last_assessed_at || c.latest_assessment?.assessed_at;
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return localParts(new Date(t), tz).date;
}
export function assessmentIdOf(c: Candidate): string | null {
  const id = c.schedule?.last_assessment_id || c.latest_assessment?.id;
  return id ? String(id) : null;
}
/** True when the user's local date is on the check due day or the one grace day after it. */
export function checkDueOn(kind: "check7" | "check14", nowDate: string, c: Candidate, tz: string | null | undefined): boolean {
  if (kind === "check7" && c.schedule?.next_check_at) {
    const dueAt = Date.parse(c.schedule.next_check_at);
    if (!Number.isFinite(dueAt)) return false;
    const due = localParts(new Date(dueAt), tz).date;
    return nowDate >= due && nowDate < ymdAdd(due, CHECK_GRACE_DAYS + 1);
  }
  const start = assessmentLocalDate(c, tz);
  if (!start) return false;
  const due = ymdAdd(start, kind === "check7" ? CHECK7_DAYS : CHECK14_DAYS);
  return nowDate >= due && nowDate < ymdAdd(due, CHECK_GRACE_DAYS + 1);
}

/** "Monday, December 28" or "Monday, December 28, 2027" when the year is not the current year in tz. */
export function friendlyDate(iso: string | null | undefined, tz: string | null | undefined, now: Date): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const zone = validTz(tz) ? tz : DEFAULT_TZ;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).formatToParts(new Date(t));
  const g = (x: string) => parts.find((p) => p.type === x)?.value ?? "";
  const body = `${g("weekday")}, ${g("month")} ${g("day")}`;
  if (!g("weekday") || !g("month") || !g("day")) return null;
  const nowYear = localParts(now, zone).date.slice(0, 4);
  return g("year") && g("year") !== nowYear ? `${body}, ${g("year")}` : body;
}

/** Day-14 email version B if a quick check already happened. */
export function quickCheckDone(c: Candidate): boolean {
  if (c.has_quick_check) return true;
  const last = c.schedule?.last_assessed_at;
  if (!last) return false;
  const start = Date.parse(last);
  if (!Number.isFinite(start)) return false;
  const day14 = start + 14 * 86400000;
  if (c.schedule?.next_check_at == null) return true;
  const nxt = Date.parse(c.schedule.next_check_at);
  return Number.isFinite(nxt) && nxt >= day14 - 1000;
}

function retestIsoOf(c: Candidate): string | null {
  if (c.schedule?.next_retest_at) return c.schedule.next_retest_at;
  const a = c.schedule?.last_assessed_at || c.latest_assessment?.assessed_at;
  if (!a) return null;
  const t = Date.parse(a);
  if (!Number.isFinite(t)) return null;
  return new Date(t + RETEST_DAYS * 86400000).toISOString();
}

export function planKind(kind: Kind, now: Date, cands: Candidate[], opts: { all: boolean; canary: ReadonlySet<string> }) {
  const due: Due[] = [];
  const skipped: Partial<Record<SkipReason, number>> = {};
  const skip = (r: SkipReason) => { skipped[r] = (skipped[r] ?? 0) + 1; };
  for (const c of cands) {
    if (!opts.all && !opts.canary.has(c.user_id)) { skip("not_canary"); continue; }
    if (!c.pref) { skip("no_pref"); continue; }
    if (c.pref[FIELD[kind]] !== true) { skip("toggle_off"); continue; }
    if (!explicitOn(c.pref, kind)) { skip("not_explicit"); continue; }
    if (c.marketing_opt_out === true) { skip("marketing_opt_out"); continue; }
    if (c.deletion_requested) { skip("deletion_requested"); continue; }
    if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { skip("no_email"); continue; }
    const lp = localParts(now, c.pref.timezone);
    const hour = kind === "digest" ? DEFAULT_HOUR : reminderHour(c.pref.reminder_time);
    if (!inWindow(lp.hour, hour)) { skip("outside_send_window"); continue; }
    const base = { kind, user_id: c.user_id, email: c.email, first_name: firstName(c.full_name, c.email), active_sport: c.active_sport, local_date: lp.date };
    if (kind === "retest") {
      if (!c.latest_assessment) { skip("no_assessment"); continue; }
      const at = Date.parse(c.latest_assessment.assessed_at);
      const days = (now.getTime() - at) / 86400000;
      if (!Number.isFinite(at) || days < RETEST_DAYS || days >= RETEST_DAYS + RETEST_GRACE_DAYS) { skip("not_due"); continue; }
      due.push({ ...base, email_id: `lc-retest-${c.latest_assessment.id}` });
    } else if (kind === "check7" || kind === "check14") {
      const id = assessmentIdOf(c);
      if (!id || (!c.latest_assessment && !c.schedule?.last_assessed_at)) { skip("no_assessment"); continue; }
      if (!checkDueOn(kind, lp.date, c, c.pref.timezone)) { skip("not_due"); continue; }
      const done = quickCheckDone(c);
      due.push({
        ...base,
        email_id: `lc-${kind}-${id}`,
        retest_date: friendlyDate(retestIsoOf(c), c.pref.timezone, now),
        next_check_date: friendlyDate(c.schedule?.next_retest_at ?? retestIsoOf(c), c.pref.timezone, now),
        quick_check_done: done,
      });
    } else if (kind === "protocol") {
      if (!PROTOCOL_DAYS.includes(lp.dow)) { skip("wrong_weekday"); continue; }
      if (!c.has_protocol) { skip("no_protocol"); continue; }
      if (c.session_dates.includes(lp.date)) { skip("session_already_logged"); continue; }
      due.push({ ...base, email_id: `lc-protocol-${lp.date}` });
    } else {
      if (lp.dow !== DIGEST_DOW) { skip("wrong_weekday"); continue; }
      const score = c.latest_score;
      if (!c.latest_assessment || typeof score !== "number") { skip("no_score"); continue; }
      // Delta is against the PREVIOUS assessment (the comparison My Body shows), never "last week". One assessment = no delta.
      const delta = typeof c.previous_score === "number" ? score - c.previous_score : null;
      due.push({ ...base, email_id: `lc-digest-${lp.date}`, digest: { score, delta, streak: streakDays(c.session_dates, lp.date) } });
    }
  }
  return { due, skipped };
}

export function maskEmail(e: string): string {
  const [l, d] = e.split("@");
  return `${(l ?? "").slice(0, 1)}***@${d ?? ""}`;
}
