// P1-07: next_retest_at / next_check_at date math. Pure. Migration unapplied; this is not live.
export const RETEST_DAYS = 42;
export const CHECK_DAYS = 7;

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

export function scheduleRow(userId: string, assessmentId: string, assessedAt: string, nowIso: string) {
  const s = scheduleFromAssessedAt(assessedAt);
  return {
    user_id: userId,
    last_assessment_id: assessmentId,
    last_assessed_at: assessedAt,
    next_retest_at: s.next_retest_at,
    next_check_at: s.next_check_at,
    updated_at: nowIso,
  };
}
