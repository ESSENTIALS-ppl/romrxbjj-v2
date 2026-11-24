// Staged (Grant 4:30 PM ET Nov 24 2026): ROMBot quotes the app's dial and change chip. This entry re-exports the
// CLIENT code unchanged (romrx-io-web 01954ec4 app/src/lib + patch cf34f371), bundled by esbuild into
// supabase/functions/ai-chat/mobility_score.js. Do not hand-edit the bundle; rebuild it (BUILD-NOTE.md).
export { mobilityScoreForAssessment, mobilityRawScoreForAssessment } from './app/src/lib/mobilityBands'
export { gateAssessment, gateJointScores } from './app/src/lib/hipFlexGate'
export { setHipFlexScoredAtMs } from './app/src/lib/hipFlexCutoverState'
