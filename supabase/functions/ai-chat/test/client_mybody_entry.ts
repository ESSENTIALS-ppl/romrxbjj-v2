// Test-only: the My Body numbers exactly as the client computes them (useProfile gating + MyBody.tsx with patch cf34f371).
import { mobilityScoreForAssessment, mobilityRawScoreForAssessment } from '../score-src/app/src/lib/mobilityBands'
import { gateAssessment, gateJointScores } from '../score-src/app/src/lib/hipFlexGate'
import { setHipFlexScoredAtMs } from '../score-src/app/src/lib/hipFlexCutoverState'
export function myBody(rows: any[], latestScores: any[], cutMs: number | null, hipIds: Set<string>) {
  setHipFlexScoredAtMs(cutMs)
  const assessment = gateAssessment(rows[0], hipIds)                     // useProfile gated.assessment
  const assessments = rows.map(a => gateAssessment(a, hipIds))           // useProfile gated.assessments
  const jointScores = gateJointScores(rows[0], latestScores)             // useProfile gated.jointScores
  const prs = mobilityScoreForAssessment(assessment, jointScores)        // MyBody dial
  const previousAssessment = assessments.length > 1 ? assessments[1] : null
  const previousRaw = previousAssessment ? mobilityRawScoreForAssessment(previousAssessment) : null
  const prsDelta = previousRaw != null ? mobilityRawScoreForAssessment(assessment) - previousRaw : null // patched chip
  return { prs, prsDelta, previousAt: previousAssessment?.assessed_at ?? null }
}
