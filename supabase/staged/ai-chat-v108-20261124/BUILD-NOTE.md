# ai-chat v108 (STAGED, NOT DEPLOYED; Grant 4:44 PM ET Nov 24 2026), built on live v107
Built on: live v107 (rollback/live-v107/, CLI readback, ezbr 97a75144). Changed: handler.js (V108-vs-v107-handler.diff) and mobility_score.js (MOBILITY-SCORE-v107-vs-tag.diff). index.ts, romood_chat.js, romood_tips.js and _shared/rate_limit.ts are byte-identical to v107.

Item 1, doorway dose (Reid v107: "30 seconds, 3-5 sets daily", dropping "(90-150 sec total)"):
- v107's prompt DOES carry the full string. V107-CONTEXT-CHECK.txt shows "Doorway Pec Stretch - 30 sec, 3-5 sets daily (90-150 sec total)", the same as the DB reps. So the model paraphrased it; nothing is truncated in code.
- Fix: one "Dose rule" line after the Base protocol block: timed and hold doses are quoted word for word, including parentheses. Rep lines stay "3 sets of 10" (Jim L997).
- The protocol lines themselves are unchanged (identical to v107/v105).

Item 2, one number everywhere:
- mobility_score.js is rebuilt from romrx-io-web tag frozen-20261124/fg-08-mybody-progress-v2 (e3aaeacb, tip 311538a1).
  - mobilityBands.ts, lumbarFlag.ts, hipFlexGate.ts and hipFlexCutoverState.ts at the tag are byte-identical to the v107 build's sources.
  - Bundle diff vs v107: only the banner, plus Jules's bodyScoreChange (= raw(later) - raw(earlier), jointHistory.ts).
- Build: client-src/build.mjs (esbuild 0.28.2). react and ./supabase are stubbed because only pure functions are bundled; the stubs are tree-shaken out. Reproducible: sha256 92025b9a both times.
- ai-chat now computes every change with bodyScoreChange, picking assessments the same way as MyBody.tsx at the tag:
  - previous = newest earlier: "Change since previous assessment (Nov 10 to latest): +4". This is the "vs Nov 10" chip.
  - first = first full assessment by assessed_at: "Change since first assessment (Oct 4 to latest): +10". This is the Body score row in Where you started / Where you are now.
  - Only one line is shown when the first assessment is also the previous one.
  - The dial is unchanged (89). History lines (ROMBOT_HISTORY flag path) also use bodyScoreChange.
- Raw rom_total (89 -> 94, +5) is never in the prompt. It is not shown in the app either (no rom_total in pages/components at the tag).
- New read: one extra select for the first full assessment (asc, limit 1, non-quick), the same as useFirstAssessment. If it fails, the oldest loaded assessment is used, as in the client.

Tests (all pass, run from this folder):
- test/v108_one_number.test.mjs: compiles the TAG's client code (dial, bodyScoreChange chip, buildStartedVsNow Body score row) and compares it with the server on ebfe4f3d: dial 89, chip +4 = ROMBot +4, Body score row +10 = ROMBot +10, plus the fallback case. v107 change equals v108 change. The prompt has no "94" or "+5". The 2-assessment case gives one line. The Tuesday protocol block is identical to v107 (doorway full string, face pull 3 sets of 10), and the dose rule is present.
- test/fg17_today.test.mjs: passes.
- deno check index.ts: OK. mobility_score.js loads in Deno.
Deploy (tomorrow, see RUNBOOK): deploy_edge_function name ai-chat, entrypoint source/index.ts, verify_jwt true, 6 files from source/.
Rollback: rollback/live-v107/ (6 files). Older rollbacks: STAGED-ai-chat-v107-restore-3x10-20261124/rollback/live-v106 and live-v105.
