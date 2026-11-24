# Receipt: ai-chat v108 deploy (Nov 24, 2026)
Approval: Grant 6:40 PM ET order, step 2, after the io publish (6b0621ca live 6:46:40 PM ET). Staged set STAGED-ai-chat-v108-20261124, SHA256SUMS 7b2311c0, sha256sum -c all OK; tests v108_one_number and fg17_today pass.
Change vs v107 (handler.js 21af75b8, mobility_score.js 92025b9a; other 4 files byte-identical to v107):
- Doorway dose rule: timed or hold doses quoted word for word, e.g. "30 sec, 3-5 sets daily (90-150 sec total)"; rep lines stay "3 sets of 10" (Jim L997).
- One number: ROMBot's changes use bodyScoreChange, the same source as the app's "vs Nov 10" chip and the "Where you started / Where you are now" Body score row. jointHistory.ts, mobilityBands.ts, assessmentReads.ts, hipFlexGate.ts, hipFlexCutover(State).ts, lumbarFlag.ts in v108's build are byte-identical to the published 113f1d45 and to 311538a1.
Before: ai-chat v107 ezbr 97a75144..., updated 4:40:06 PM ET (BEFORE-function-list.txt, 42 functions).
After: ai-chat v108 ezbr efb68251a407f3b6d1dda8a66404ca40059348a5402039bb4c1fd48ce40d3d88, verify_jwt true, updated 6:48:05 PM ET. Diff of the before/after lists: only the ai-chat line.
Deploy: MCP deploy_edge_function by name ai-chat, entrypoint source/index.ts, verify_jwt true, 6 files.
Readback (CLI download, read-only): index.ts 728ea3cc, handler.js 21af75b8, mobility_score.js 92025b9a, romood_chat.js 3f6edd25, romood_tips.js 15021f44, _shared/rate_limit.ts f3a82f1d: all MATCH the staged source.
Smoke 6:48:21 PM ET: OPTIONS 200; POST without auth 401.
ROMBot check on ebfe4f3d: not sent by Avery. It needs that user's signed-in session; getting one here means using a key or password, so it goes to Reid (one message). Expected: score 89; +4 since Nov 10 (+10 since Oct 4 if mentioned); never 94 or +5; doorway "30 sec, 3-5 sets daily (90-150 sec total)" verbatim; face pull 3 sets of 10.
Rollback: deploy_edge_function ai-chat, entrypoint source/index.ts, verify_jwt true, the 6 files in STAGED-ai-chat-v108-20261124/rollback/live-v107/ (v107 shas in DEPLOY-ai-chat-v107-20261124), then before/after lists and readback.
