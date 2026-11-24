# Runbook: deploy ai-chat v108 (tomorrow, AFTER Jules's io publish that carries tag fg-08-mybody-progress-v2)
Gate: Grant's go. The io publish of 311538a1 (or a tag containing it) is live, so the app's chip and "Where you started" row exist and match ROMBot's two lines. Until then ROMBot would describe a Body score row the live app does not show yet.
1. Verify the staged set: cd FG-LIST-20261124/STAGED-ai-chat-v108-20261124 && sha256sum -c SHA256SUMS (all OK).
2. Re-run tests: node test/v108_one_number.test.mjs && node test/fg17_today.test.mjs.
3. Confirm live is still v107: list_edge_functions -> ai-chat v107 ezbr 97a75144. If not, STOP: rebuild v108 on the new live source first (CLI `supabase functions download ai-chat`, read-only). Save the full list as BEFORE-function-list.txt (slug, version, ezbr, verify_jwt, updated_at in ET).
4. Deploy by name: user-Supabase deploy_edge_function, project cqzvqzwwevnflinxgnpp, name ai-chat, entrypoint_path source/index.ts, verify_jwt true. Files:
   - source/index.ts
   - source/handler.js (21af75b8)
   - source/mobility_score.js (92025b9a)
   - source/romood_chat.js
   - source/romood_tips.js
   - _shared/rate_limit.ts
   The $file: substitution takes at most 4 files per call, so pass index.ts and romood_tips.js inline (exact bytes).
5. AFTER list_edge_functions: only ai-chat differs (v108, new ezbr, updated_at). Readback via CLI download: all 6 sha256 must match source/.
6. Smoke (no writes): OPTIONS 200, unauthenticated POST 401.
7. Reid recheck on ebfe4f3d:
   - "What's my overall score?" -> 89.
   - "Did I improve?" -> +4 since Nov 10 (and +10 since Oct 4 if asked about since starting); never 94 or +5.
   - "Today's protocol?" (Tuesday) -> doorway "30 sec, 3-5 sets daily (90-150 sec total)" verbatim; face pull "3 sets of 10".
8. Rollback if anything is off: deploy_edge_function ai-chat, entrypoint source/index.ts, verify_jwt true, files from rollback/live-v107/ (6 files). Then the same before/after/readback steps.
No flags, secrets or sends are involved.
