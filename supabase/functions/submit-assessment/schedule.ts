// P1-07/P1-06: next_retest_at / next_check_at / check_joints. Pure. Migration unapplied; this is not live.
export const RETEST_DAYS = 42;
export const CHECK_DAYS = 7;
export const CHECK14_DAYS = 14;

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

/** After a quick check: set next_check_at to day 14 if that has not passed; otherwise clear it. Does not touch next_retest_at. */
export function nextCheckAfterQuick(lastAssessedAt: string, nowIso: string): string | null {
  const day14 = addDaysIso(lastAssessedAt, CHECK14_DAYS);
  if (Date.parse(nowIso) < Date.parse(day14)) return day14;
  return null;
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
