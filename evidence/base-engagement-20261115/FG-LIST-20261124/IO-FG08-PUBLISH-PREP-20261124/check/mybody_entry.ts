// My Body numbers for one user, computed with the CLIENT code of the commit under test, following MyBody.tsx (FG-08 cut):
// trend = buildJointTrends(my_joint_history rpc rows) (the page's first source), else start-vs-now rpc, else local;
// Where you started / now = buildStartedVsNow(first, latest); chip = bodyScoreChange(earlier[0], latest).delta; dial = mobilityScoreForAssessment.
import { mobilityScoreForAssessment, jointDisplayRowsForAssessment } from './src/app/src/lib/mobilityBands'
import { isLumbarKey } from './src/app/src/lib/lumbarFlag'
import { bodyScoreChange, buildStartedVsNow, buildJointTrends, buildStartVsNowTrends, buildLocalTrends } from './src/app/src/lib/jointHistory'
import { gateAssessment, gateJointScores } from './src/app/src/lib/hipFlexGate'
import { setHipFlexScoredAtMs } from './src/app/src/lib/hipFlexCutoverState'
import { sortByAssessedAtNewestFirst, assessedAtMs } from './src/app/src/lib/assessmentReads'
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
export function myBody(fx: any, rpc: any) {
  setHipFlexScoredAtMs(Date.parse(fx.cut))
  const hip = new Set<string>(fx.hipIds ?? [])
  const rows = sortByAssessedAtNewestFirst(fx.rows)
  const assessments = rows.map((a: any) => gateAssessment(a, hip))
  const assessment = assessments[0]
  const jointScores = gateJointScores(rows[0], fx.latestScores)
  const latestMs = assessedAtMs(assessment)
  const earlier = assessments.filter((a: any) => a.id !== assessment.id && (latestMs == null || (assessedAtMs(a) ?? -Infinity) <= latestMs))
  const jointRows = jointDisplayRowsForAssessment(assessment, jointScores).filter((r: any) => !isLumbarKey(r.key)).filter((r: any) => r.key !== 'hip_flex' || r.left != null || r.right != null)
  const keys = jointRows.map((r: any) => r.key)
  const local = buildLocalTrends([assessment, ...earlier], assessment.id, jointScores, keys)
  const src = rpc.history?.length ? buildJointTrends(rpc.history) : rpc.startNow?.length ? buildStartVsNowTrends(rpc.startNow) : local
  const trends = jointRows.map((jr: any) => ({ key: jr.key, label: jr.label, series: src.find((t: any) => t.key === jr.key) }))
    .filter((t: any) => t.series && t.series.points.length >= 2)
    .map((t: any) => ({ joint: t.label, points: t.series.points.map((p: any) => `${day(p.date)} ${p.pct}%`) }))
  const firstRow = [...fx.rows].sort((a: any, b: any) => Date.parse(a.assessed_at) - Date.parse(b.assessed_at))[0]
  const first = earlier.find((a: any) => a.id === firstRow.id) ?? gateAssessment(firstRow, hip) ?? earlier[earlier.length - 1] ?? null
  const svn = buildStartedVsNow(first, assessment, jointScores, keys)
  const prev = earlier[0] ?? null
  return {
    dial: mobilityScoreForAssessment(assessment, jointScores),
    chip: prev ? bodyScoreChange(prev, assessment).delta : null,
    chipVs: prev ? new Date(prev.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : null,
    startedVsNow: svn ? { started: day(svn.started.date), now: day(svn.now.date), bodyScoreChange: svn.delta, joints: svn.joints.map((j: any) => `${j.label} ${j.started ?? '-'}% -> ${j.now ?? '-'}%`) } : null,
    trendSource: rpc.history?.length ? 'my_joint_history rpc' : rpc.startNow?.length ? 'my_joint_start_vs_now rpc' : 'local',
    trends,
  }
}
