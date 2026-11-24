# ai-chat v107 LIVE: Base sets/reps restored to v105 "3 sets of 10" (Jim L997); score fix and FG-17 kept, 2026-11-24
Why: Jim's own decision (ledger L997, Nov 3 2026): "Yes, change ROMBot to say 3 sets of 10 for everyone." v106's card-dose change (from a relay of Grant 4:32 PM ET) is reverted. Built from live v106 (staged set STAGED-ai-chat-v107-restore-3x10-20261124/, SUMS c8a436f4, BUILD-NOTE.md).
Change vs v106: handler.js only. cardDose, formatProtocolBase and the "Sets and reps rule" line are removed; the Base prompt uses formatProtocol again. Every rep line is "3 sets of 10", timed holds keep their time, null reps = 3 sets of 10.
Kept: the score fix (My Body dial, capped; uncapped change; never rom_total; mobility_score.js 67abb540) and the FG-17 Today rotation.
Tests (pass):
- The ebfe4f3d Base protocol block is identical to v105's. Tuesday: "Band Face Pull with External Rotation - 3 sets of 10"; Doorway Pec Stretch "30 sec, 3-5 sets daily (90-150 sec total)"; Ball release "60-90 sec each side". Null and timed cases equal v105.
- Score: dial 89, change +4 (equal to the client).
- FG-17 rotation passes. deno check OK.
BEFORE (4:39:38 PM ET): 42 functions; ai-chat v106 ezbr 9947b115 verify_jwt true, updated 4:36:13 PM ET. No other change since v106.
Deploy: MCP deploy_edge_function by name ai-chat, entrypoint source/index.ts, verify_jwt true, 6 files: handler.js e93d621c (only change), index.ts 728ea3cc, mobility_score.js 67abb540, romood_chat.js 3f6edd25, romood_tips.js 15021f44, _shared/rate_limit.ts f3a82f1d.
AFTER (4:40:21 PM ET): 42 functions; ai-chat v107 ezbr 97a7514472c328a290cd8dabb0475a6d8fdfb9aeb99925f4f5abb2e2c868c882 verify_jwt true, updated 4:40:06 PM ET. The other 41 lines are identical.
Readback: CLI download of v107: 6 files, all sha256 MATCH. OPTIONS 200; POST with no auth 401. No signed-in chat sent.
Rollbacks kept (not run), the same call with files from:
- STAGED-ai-chat-v107-restore-3x10-20261124/rollback/live-v106/ (6 files)
- rollback/live-v105/ (5 files)
Flags, secrets, sends: none touched. Sport/pack prompts: unchanged.
