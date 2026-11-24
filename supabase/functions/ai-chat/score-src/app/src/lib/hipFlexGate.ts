import { hipFlexScoredFor } from './hipFlexCutoverState'

// FG-36 gate. Assessments saved BEFORE the hip flexion cutover (scoring_cutovers.hip_flex_scored) render exactly as they did when hip
// flexion was unscored: the hip flexion values, its persisted joint score and its worst_joints entry are taken out of the view, so the
// bands, per-joint %, /100, top focus areas, My Protocol and the My Body bar never include it. At or after the cutover nothing is removed.
// If the cutover is unknown (row or table missing, not signed in yet) everything counts as pre-cutover.
// L937 (Jim: rescore past assessments): a row that HAS a hip flexion score (a joint_scores row with a score, written by the rescore) is shown
// whatever its date. The date gate above now applies only to assessments with no hip flexion score.
const HIP_FLEX_FIELDS = ['hip_flex_l', 'hip_flex_r'] as const

export function gateAssessment<T extends object>(a: T, hipScoredIds?: ReadonlySet<string>): T
export function gateAssessment<T extends object>(a: T | null | undefined, hipScoredIds?: ReadonlySet<string>): T | null
export function gateAssessment<T extends object>(a: T | null | undefined, hipScoredIds?: ReadonlySet<string>): T | null {
  if (!a) return null
  if (hipFlexScoredFor(a)) return a
  const id = (a as Record<string, unknown>).id
  if (typeof id === 'string' && hipScoredIds?.has(id)) return a // has a hip flexion score (rescored): show it whatever the date
  const rec = { ...(a as Record<string, unknown>) }
  for (const k of HIP_FLEX_FIELDS) if (k in rec) rec[k] = null
  if (Array.isArray(rec.worst_joints)) rec.worst_joints = (rec.worst_joints as string[]).filter(j => !String(j).startsWith('hip_flex'))
  return rec as T
}

export function gateJointScores<R extends { joint_key?: string | null; joint?: string | null; score?: number | string | null }>(
  assessment: object | null | undefined,
  rows: R[],
): R[] {
  if (!assessment || hipFlexScoredFor(assessment)) return rows
  return rows.filter(r => !String(r.joint_key ?? r.joint ?? '').startsWith('hip_flex') || r.score != null)
}
