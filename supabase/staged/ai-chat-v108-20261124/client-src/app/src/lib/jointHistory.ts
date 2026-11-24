import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { radarSideRowsForAssessment, jointDisplayRowsForAssessment, mobilityRawScoreForAssessment, ASSESSMENT_JOINTS, type JointScoreRow } from './mobilityBands'
import { gateJointScores } from './hipFlexGate'
import { loadHipScoredIds } from './hipFlexCutover'
import { assessedAtMs, skipQuick, sortByAssessedAtNewestFirst } from './assessmentReads'

// FG-08: per-joint trend data from Avery's read-only rpcs (my_joint_history, my_joint_start_vs_now). Signed-in user only.
// If an rpc is missing or errors, the hook returns null for it and the page keeps its own on-device trend (silent fallback, no new text).

export type HistoryRow = {
  assessment_id: string
  assessed_at: string
  joint_key: string
  left_value: number | null
  right_value: number | null
  score?: number | null // L937: the joint_scores score (my_joint_history returns it)
}
export type StartNowRow = {
  joint_key: string
  first_assessed_at: string
  latest_assessed_at: string
  first_left: number | null
  first_right: number | null
  latest_left: number | null
  latest_right: number | null
  first_score?: number | null // L937: my_joint_start_vs_now returns these
  latest_score?: number | null
}
/** i = position on the time axis (0 .. n-1). A joint with no row for an assessment has no point there: a gap, never zero. */
export type TrendPoint = { date: string; pct: number; i: number }
export type TrendSeries = { key: string; n: number; points: TrendPoint[] }

const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/** Rebuild an assessment-shaped record from one joint's left/right values so the existing Base % formula is the only formula. */
function recordFor(jointKey: string, left: number | null, right: number | null): Record<string, number | null> {
  const def = ASSESSMENT_JOINTS.find(j => j.key === jointKey)
  if (!def) return {}
  if (def.single) return { [def.single]: left ?? right }
  return { [def.l!]: left, [def.r!]: right }
}

function pctFor(jointKey: string, left: number | null, right: number | null): number | null {
  const row = radarSideRowsForAssessment(recordFor(jointKey, left, right), null).find(r => r.key === jointKey)
  return row && row.measured ? row.worse : null
}

/** Pure. rows may arrive in any order; the time axis is the user's assessments, oldest first. Hip flexion rows from before the cutover are dropped. */
export function buildJointTrends(rows: HistoryRow[]): TrendSeries[] {
  const byAssessment = new Map<string, { at: string; rows: HistoryRow[] }>()
  for (const r of rows) {
    const e = byAssessment.get(r.assessment_id) ?? { at: r.assessed_at, rows: [] }
    e.rows.push(r)
    byAssessment.set(r.assessment_id, e)
  }
  // FG-08: oldest first by assessed_at (the rpc's assessed_at column), never created_at.
  const timeline = sortByAssessedAtNewestFirst([...byAssessment.values()].map(v => ({ ...v, assessed_at: v.at }))).reverse()
  const n = timeline.length
  const series = new Map<string, TrendPoint[]>()
  timeline.forEach((t, i) => {
    for (const r of gateJointScores({ assessed_at: t.at }, t.rows)) {
      const pct = pctFor(r.joint_key, num(r.left_value), num(r.right_value))
      if (pct == null) continue
      const pts = series.get(r.joint_key) ?? []
      pts.push({ date: t.at, pct, i })
      series.set(r.joint_key, pts)
    }
  })
  return [...series.entries()].map(([key, points]) => ({ key, n, points }))
}

/** Pure. Two points per joint (first and latest) when only my_joint_start_vs_now is available. */
export function buildStartVsNowTrends(rows: StartNowRow[]): TrendSeries[] {
  const out: TrendSeries[] = []
  for (const r of rows) {
    const first = gateJointScores({ assessed_at: r.first_assessed_at }, [{ ...r, score: r.first_score }]).length ? pctFor(r.joint_key, num(r.first_left), num(r.first_right)) : null
    const latest = gateJointScores({ assessed_at: r.latest_assessed_at }, [{ ...r, score: r.latest_score }]).length ? pctFor(r.joint_key, num(r.latest_left), num(r.latest_right)) : null
    const points: TrendPoint[] = []
    if (first != null) points.push({ date: r.first_assessed_at, pct: first, i: 0 })
    if (latest != null) points.push({ date: r.latest_assessed_at, pct: latest, i: 1 })
    if (points.length) out.push({ key: r.joint_key, n: 2, points })
  }
  return out
}

export function useJointHistory(): { history: HistoryRow[] | null; startNow: StartNowRow[] | null } {
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [startNow, setStartNow] = useState<StartNowRow[] | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('my_joint_history', { p_limit: 20 })
        if (live && !error && Array.isArray(data)) setHistory(data as HistoryRow[])
      } catch { /* keep the on-device trend */ }
      try {
        const { data, error } = await supabase.rpc('my_joint_start_vs_now')
        if (live && !error && Array.isArray(data)) setStartNow(data as StartNowRow[])
      } catch { /* keep the on-device trend */ }
    })()
    return () => { live = false }
  }, [])
  return { history, startNow }
}

type AssessmentLike = { id: string; assessed_at: string }

/**
 * FG-08: the on-device trend (used when the rpcs are missing). Same values as the Joint Breakdown bars: the worse-side %
 * from radarSideRowsForAssessment, with the latest assessment's joint_scores. The time axis is oldest first by
 * assessed_at whatever order the rows arrive in. Each point carries its assessed_at date and its % value.
 */
export function buildLocalTrends<A extends AssessmentLike>(assessments: readonly A[], latestId: string, latestScores: JointScoreRow[] | null, jointKeys: readonly string[]): TrendSeries[] {
  const timeline = sortByAssessedAtNewestFirst(assessments).reverse()
  if (timeline.length < 2) return []
  const rowsByAssessment = timeline.map(a => ({ date: a.assessed_at, rows: radarSideRowsForAssessment(a, a.id === latestId ? latestScores : null) }))
  return jointKeys.map(key => ({
    key,
    n: timeline.length,
    points: rowsByAssessment
      .map((t, i) => { const r = t.rows.find(x => x.key === key); return r && r.measured && !r.unscored ? { date: t.date, pct: r.worse, i } : null })
      .filter((x): x is TrendPoint => x !== null),
  }))
}

/**
 * Score-fix + FG-08: the Body score change between two assessments, on the unclamped /100 average
 * (mobilityRawScoreForAssessment). The ONE source for the My Body "vs <date>" chip AND the Where you started /
 * Where you are now totals, so the two always agree. The dial keeps the band-clamped mobilityScoreForAssessment.
 */
export function bodyScoreChange(earlier: object, later: object): { before: number; now: number; delta: number } {
  const before = mobilityRawScoreForAssessment(earlier)
  const now = mobilityRawScoreForAssessment(later)
  return { before, now, delta: now - before }
}

export type StartedVsNowJoint = { key: string; label: string; started: number | null; now: number | null }
export type StartedVsNow = {
  started: { date: string }
  now: { date: string }
  /** Body score change first to latest, from bodyScoreChange (the chip's function). No absolute score is carried (Grant 4:36 PM ET). */
  delta: number
  joints: StartedVsNowJoint[]
}

/**
 * FG-08: "Where you started" (the first full assessment by assessed_at) vs "Where you are now" (the latest).
 * Body score = the CHANGE only, from bodyScoreChange (unclamped /100 average, Avery 4:30 PM ET), the same function as the
 * "vs <date>" chip, so the two always agree. No absolute score (Grant 4:36 PM ET: the dial is the only Body score number). Per joint = the Joint Breakdown bar % (jointDisplayRowsForAssessment).
 * Returns null when there is no earlier assessment (one assessment on file): no comparison is shown.
 * jointKeys = the joints on the Joint Breakdown, in its order (lumbar and pre-cutover hip flexion already filtered there).
 */
export function buildStartedVsNow<A extends AssessmentLike>(first: A | null | undefined, latest: A, latestScores: JointScoreRow[] | null, jointKeys: readonly string[]): StartedVsNow | null {
  if (!first || first.id === latest.id) return null
  const ft = assessedAtMs(first), lt = assessedAtMs(latest)
  if (ft == null || lt == null || ft >= lt) return null
  const before = new Map(jointDisplayRowsForAssessment(first, null).map(r => [r.key, r]))
  const now = new Map(jointDisplayRowsForAssessment(latest, latestScores).map(r => [r.key, r]))
  const joints: StartedVsNowJoint[] = []
  for (const key of jointKeys) {
    const n = now.get(key)
    if (!n) continue
    joints.push({ key, label: n.label, started: before.get(key)?.pct ?? null, now: n.pct ?? null })
  }
  const total = bodyScoreChange(first, latest)
  return {
    started: { date: first.assessed_at },
    now: { date: latest.assessed_at },
    delta: total.delta,
    joints,
  }
}

/**
 * FG-08: the user's first full assessment, by assessed_at ascending (get_my_profile only returns the newest 4), plus
 * whether it has a hip flexion score (L937, for gateAssessment). Read-only, RLS (assessments: user_id = auth.uid()),
 * quick checks skipped. first is null until loaded or on any error; the page then uses the oldest assessment it already has.
 */
export function useFirstAssessment<A>(userId: string | undefined): { first: A | null; hipScoredIds: ReadonlySet<string> } {
  const [state, setState] = useState<{ first: A | null; hipScoredIds: ReadonlySet<string> }>({ first: null, hipScoredIds: new Set() })
  useEffect(() => {
    if (!userId) return
    let live = true
    void (async () => {
      try {
        const { data, error } = await skipQuick(supabase.from('assessments')
          .select('*')
          .eq('user_id', userId))
          .order('assessed_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (error || !data) return
        const id = (data as { id?: unknown }).id
        const hipScoredIds = typeof id === 'string' ? await loadHipScoredIds([id]) : new Set<string>()
        if (live) setState({ first: data as A, hipScoredIds })
      } catch { /* keep the oldest loaded assessment */ }
    })()
    return () => { live = false }
  }, [userId])
  return state
}
