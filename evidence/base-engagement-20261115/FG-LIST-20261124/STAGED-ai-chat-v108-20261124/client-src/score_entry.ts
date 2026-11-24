// ai-chat v108: re-exports the CLIENT code unchanged from romrx-io-web tag frozen-20261124/fg-08-mybody-progress-v2
// (e3aaeacb, tip 311538a1), bundled by build.mjs into supabase/functions/ai-chat/mobility_score.js. Do not hand-edit the bundle.
export { mobilityScoreForAssessment, mobilityRawScoreForAssessment } from './app/src/lib/mobilityBands'
export { bodyScoreChange } from './app/src/lib/jointHistory'
export { gateAssessment, gateJointScores } from './app/src/lib/hipFlexGate'
export { setHipFlexScoredAtMs } from './app/src/lib/hipFlexCutoverState'
