# ai-chat v107 build: v106 with the Base sets/reps restored to v105 (Jim L997), 2026-11-24
Why: Jim's own decision (ledger L997, Nov 3 2026): "Yes, change ROMBot to say 3 sets of 10 for everyone." v106's card-dose change came from a relay and cannot override it.
Built on: live v106 (rollback/live-v106/, CLI readback, ezbr 9947b115).
Changed vs v106: handler.js only (V107-vs-v106-handler.diff).
- Removed cardDose and formatProtocolBase, and the "Sets and reps rule" line.
- The Base prompt uses formatProtocol again (v105/v96d: every rep line "3 sets of 10"; timed holds keep their time; null reps -> 3 sets of 10).
Kept from v106: the score fix (mobility_score.js; capped dial plus uncapped change; never rom_total). Kept from v105: FG-17 today logic.
Check: V107-vs-v105-handler.diff touches no protocol, sets or reps code.
Tests (all pass, run from this folder):
- test/v107_sets_reps_3x10.test.mjs: the Base protocol block for ebfe4f3d is identical to v105. Tuesday face pull reads "3 sets of 10"; the Doorway Pec Stretch and Ball release keep their times; null and timed cases match v105.
- test/score_capped.test.mjs: ebfe4f3d dial 89, change +4, same as the client.
- test/fg17_today.test.mjs: passes.
- deno check index.ts: OK.
Deploy: deploy_edge_function name ai-chat, entrypoint source/index.ts, verify_jwt true, 6 files from source/.
Rollbacks:
- rollback/live-v106/ (6 files)
- rollback/live-v105/ (5 files, no mobility_score.js)
