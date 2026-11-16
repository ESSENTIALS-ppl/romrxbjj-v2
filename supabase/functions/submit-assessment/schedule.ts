// P1-07/P1-06: next_retest_at / next_check_at / check_joints. Pure. Migration unapplied; this is not live.
export const RETEST_DAYS = 42;
export const CHECK_DAYS = 7;
export const CHECK14_DAYS = 14;
// Grant (Nov 15): unified timezone fallback is America/New_York. Stored user tz
// (notification_preferences.timezone) is used first; only invalid or missing falls back here.
// Single constant — do not add another fallback value.
export const DEFAULT_TZ = "America/New_York";

// Field targets mirrored from compute-tiers JOINT_TARGETS (Nov 2026). Used only to pick 1-2
// provisional check_joints when assessments.worst_joints is still empty at submit time.
// hip_flex and lumbar are never ranked (same rules as compute-tiers).
const CHECK_TARGETS: Record<string, number> = {
  hip_er_l: 23, hip_er_r: 23,
  hip_ir_l: 24, hip_ir_r: 24,
  hip_abd_l: 40, hip_abd_r: 40,
  hip_ext_l: 30, hip_ext_r: 30,
  shoulder_er_l: 85, shoulder_er_r: 85,
  shoulder_flex_l: 141, shoulder_flex_r: 141,
  ankle_df_l: 6.1, ankle_df_r: 6.1,
  cervical_rot_l: 70, cervical_rot_r: 70,
  cervical_lat_l: 37, cervical_lat_r: 37,
  cervical_flex: 39, cervical_ext: 48,
  thoracic_rot_l: 45, thoracic_rot_r: 45,
};

export function addDaysIso(assessedAt: string, days: number): string {
  const t = Date.parse(assessedAt);
  if (!Number.isFinite(t)) throw new Error("bad_assessed_at");
  return new Date(t + days * 86400000).toISOString();
}

export function scheduleFromAssessedAt(assessedAt: string): { next_retest_at: string; next_check_at: string } {
  return {
    next_retest_at: addDaysIso(assessedAt, RETEST_DAYS),
    next_check_at: addDaysIso(assessedAt, CHECK_DAYS),
  };
}

export function computeCheckJoints(measurements: Record<string, unknown>): string[] {
  const rows: { key: string; gap: number }[] = [];
  for (const [key, target] of Object.entries(CHECK_TARGETS)) {
    const n = typeof measurements[key] === "number" ? measurements[key] as number : Number(measurements[key]);
    if (!Number.isFinite(n)) continue;
    rows.push({ key, gap: 1 - n / target });
  }
  rows.sort((a, b) => b.gap - a.gap);
  return rows.slice(0, 2).map((r) => r.key);
}

/** First 1-2 entries of worst_joints when they look like ROM fields; otherwise computed worst. */
export function pickCheckJoints(worstJoints: unknown, measurements: Record<string, unknown>): string[] {
  const allowed = new Set(Object.keys(CHECK_TARGETS));
  const fromStored = Array.isArray(worstJoints)
    ? worstJoints.filter((j): j is string => typeof j === "string" && allowed.has(j))
    : [];
  if (fromStored.length > 0) return fromStored.slice(0, 2);
  return computeCheckJoints(measurements);
}

export function scheduleRow(
  userId: string,
  assessmentId: string,
  assessedAt: string,
  nowIso: string,
  checkJoints: string[] = [],
) {
  const s = scheduleFromAssessedAt(assessedAt);
  return {
    user_id: userId,
    last_assessment_id: assessmentId,
    last_assessed_at: assessedAt,
    next_retest_at: s.next_retest_at,
    next_check_at: s.next_check_at,
    check_joints: checkJoints,
    updated_at: nowIso,
  };
}

/** Schedule columns submit-assessment reads before a submit (named type; fixes deno check TS2352/TS2339). */
export interface ScheduleRead {
  last_assessed_at: string;
  next_retest_at: string | null;
  next_check_at: string | null;
  check_joints: string[] | null;
}

/** Grant rule 2 (Nov 15, 9:38 PM ET): after a saved quick check, next_check_at = next_retest_at.
 *  Rule 1 (full save, scheduleRow) resets both; rule 3 (SQL roll_next_check_at) rolls after local day 7 if no quick check. */
export function nextCheckAfterQuick(s: Pick<ScheduleRead, "next_retest_at"> | null | undefined): string | null {
  return s?.next_retest_at ?? null;
}

export type CheckKind = "full" | "quick";

export function parseCheckKind(body: Record<string, unknown>): CheckKind | "invalid" {
  const raw = body.check_kind;
  if (raw === undefined || raw === null || raw === "" || raw === "full") return "full";
  if (raw === "quick") return "quick";
  return "invalid";
}

export function rejectQuickSubmit(
  body: Record<string, unknown>,
  checkJoints: string[] | null | undefined,
  numericFields: string[],
): "no_schedule" | "unexpected_joint" | "missing_scheduled_joints" | null {
  const allowed = new Set((checkJoints ?? []).filter((j) => numericFields.includes(j)));
  if (allowed.size === 0) return "no_schedule";
  for (const f of numericFields) {
    const v = body[f];
    if (v === undefined || v === null || v === "") continue;
    if (!allowed.has(f)) return "unexpected_joint";
  }
  const hasScheduled = [...allowed].some((f) => {
    const n = Number(body[f]);
    return Number.isFinite(n);
  });
  if (!hasScheduled) return "missing_scheduled_joints";
  return null;
}

export const QUICK_ERRORS: Record<string, string> = {
  no_schedule: "No quick re-check is scheduled",
  unexpected_joint: "Quick re-check only accepts the scheduled joints",
  missing_scheduled_joints: "Quick re-check needs a measurement for a scheduled joint",
};

/** The one timezone fallback. Invalid or missing tz uses DEFAULT_TZ (America/New_York). */
export function resolveTz(tz: string | null | undefined): string {
  if (!tz || typeof tz !== "string" || tz.length > 64) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** User's local calendar date (YYYY-MM-DD) for an instant. */
export function localYmd(at: Date | string, tz?: string | null): string | null {
  const t = typeof at === "string" ? Date.parse(at) : at.getTime();
  if (!Number.isFinite(t)) return null;
  const zone = resolveTz(tz);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(t));
  const g = (typ: string) => parts.find((p) => p.type === typ)?.value ?? "";
  const y = g("year"), m = g("month"), d = g("day");
  if (!y || !m || !d) return null;
  return `${y}-${m}-${d}`;
}

/** Calendar-day add on a YYYY-MM-DD string (UTC date arithmetic, no timezone shift). */
export function ymdAdd(date: string, days: number): string {
  const [y, m, d] = date.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Local day number of `now` relative to last full assessment: day 0 is that assessment's local date. */
export function localDayOffset(lastAssessedAt: string, now: Date, tz?: string | null): number | null {
  const start = localYmd(lastAssessedAt, tz);
  const today = localYmd(now, tz);
  if (!start || !today) return null;
  const [ys, ms, ds] = start.split("-").map((x) => parseInt(x, 10));
  const [yt, mt, dt] = today.split("-").map((x) => parseInt(x, 10));
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(yt, mt - 1, dt);
  return Math.round((b - a) / 86400000);
}

/** Rule 2 signal: after a saved quick check, next_check_at equals next_retest_at (a full save resets both). */
export function quickAlreadyDoneThisCycle(s: Pick<ScheduleRead, "next_check_at" | "next_retest_at"> | null | undefined): boolean {
  if (!s?.next_check_at || !s?.next_retest_at) return false;
  const a = Date.parse(s.next_check_at);
  const b = Date.parse(s.next_retest_at);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

/** Grant (a): a quick check is accepted only on local days 7 to 14 after the last full assessment,
 *  and only if the user has not already done one this cycle. Outside that, existing no_schedule error. */
export function rejectQuickWindow(
  sched: ScheduleRead | null | undefined,
  now: Date,
  tz?: string | null,
): "no_schedule" | null {
  if (!sched?.last_assessed_at) return "no_schedule";
  if (quickAlreadyDoneThisCycle(sched)) return "no_schedule";
  const day = localDayOffset(sched.last_assessed_at, now, tz);
  if (day === null || day < CHECK_DAYS || day > CHECK14_DAYS) return "no_schedule";
  return null;
}

/** A quick save writes public.assessments.user_id, assessments.check_kind = 'quick', and assessments.assessed_at.
 *  assessments.created_at is not sent; the column is timestamptz not null default now() (20260428000003).
 *  user_mobility_schedule.last_assessed_at is the last full assessment and is not moved on a quick save. */
export interface AssessmentQuickRow {
  check_kind?: string | null;
  created_at?: string | null;
}

/** True when an assessments row already has check_kind='quick' with created_at strictly after last_assessed_at. */
export function quickRowExistsThisCycle(
  lastAssessedAt: string | null | undefined,
  rows: ReadonlyArray<AssessmentQuickRow>,
): boolean {
  const start = lastAssessedAt ? Date.parse(lastAssessedAt) : NaN;
  if (!Number.isFinite(start)) return false;
  return rows.some((r) => {
    if (r.check_kind !== "quick") return false;
    const t = r.created_at ? Date.parse(r.created_at) : NaN;
    return Number.isFinite(t) && t > start;
  });
}

/** Second once-per-cycle check: a saved quick assessments row still blocks if the schedule write failed. Same no_schedule error. */
export function rejectQuickSavedRow(
  lastAssessedAt: string | null | undefined,
  rows: ReadonlyArray<AssessmentQuickRow> | null | undefined,
): "no_schedule" | null {
  return quickRowExistsThisCycle(lastAssessedAt, rows ?? []) ? "no_schedule" : null;
}
