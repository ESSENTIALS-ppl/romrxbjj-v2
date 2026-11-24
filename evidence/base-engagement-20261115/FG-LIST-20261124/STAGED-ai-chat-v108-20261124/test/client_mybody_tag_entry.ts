// Test-only: My Body numbers computed with the client functions at tag fg-08-mybody-progress-v2 (311538a1), following MyBody.tsx there:
// earlier = other assessments assessed at or before the latest; chip = bodyScoreChange(earlier[0], latest).delta;
// Body score row = buildStartedVsNow(first, latest, ...).delta; dial = mobilityScoreForAssessment(latest, jointScores).
import { mobilityScoreForAssessment, jointDisplayRowsForAssessment } from '../client-src/app/src/lib/mobilityBands'
import { bodyScoreChange, buildStartedVsNow } from '../client-src/app/src/lib/jointHistory'
import { gateAssessment, gateJointScores } from '../client-src/app/src/lib/hipFlexGate'
import { setHipFlexScoredAtMs } from '../client-src/app/src/lib/hipFlexCutoverState'
import { sortByAssessedAtNewestFirst, assessedAtMs } from '../client-src/app/src/lib/assessmentReads'
export function myBody(rowsNewestFirst: any[], latestScores: any[], cutMs: number | null, hipIds: Set<string>, firstLoaded: any | null) {
  setHipFlexScoredAtMs(cutMs)
  const assessments = sortByAssessedAtNewestFirst(rowsNewestFirst.map(a => gateAssessment(a, hipIds)))
  const assessment = assessments[0]
  const jointScores = gateJointScores(rowsNewestFirst[0], latestScores)
  const latestMs = assessedAtMs(assessment)
  const earlier = assessments.filter(a => a.id !== assessment.id && (latestMs == null || (assessedAtMs(a) ?? -Infinity) <= latestMs))
  const firstAssessment = (firstLoaded && earlier.find(a => a.id === firstLoaded.id)) ?? gateAssessment(firstLoaded, hipIds) ?? earlier[earlier.length - 1] ?? null
  const keys = jointDisplayRowsForAssessment(assessment, jointScores).map((r: any) => r.key)
  const startedVsNow = buildStartedVsNow(firstAssessment, assessment, jointScores, keys)
  const previousAssessment = earlier[0] ?? null
  return {
    dial: mobilityScoreForAssessment(assessment, jointScores),
    chip: previousAssessment ? bodyScoreChange(previousAssessment, assessment).delta : null,
    previousAt: previousAssessment?.assessed_at ?? null,
    bodyScoreRow: startedVsNow ? startedVsNow.delta : null,
    startedAt: startedVsNow ? startedVsNow.started.date : null,
  }
}
