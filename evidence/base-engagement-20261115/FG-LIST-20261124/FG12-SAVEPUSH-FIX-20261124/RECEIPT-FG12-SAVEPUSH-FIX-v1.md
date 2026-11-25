# Receipt: save-push-subscription push-off fix deploy (Nov 24, 2026)
Approval: Jim in chat 7:27 PM ET, verbatim: "Yes, deploy the push-off fix now". Grant's gate covers it.
Change: turning push off now also clears the caller's own notification_preferences.push_subscription backup for that endpoint, so send-push-notification cannot fall back to a turned-off device. Source: romrxbjj-v2 branch fix/save-push-unsubscribe-clear-own-backup-20261124, commit 9d35b136 (index.ts 6e432a4f, handler.ts 4a3e98a3 unchanged). Diff: FIX-vs-live-v30.diff (index.ts remove() only).
Before: save-push-subscription v30, ezbr ba6bd6493b6a2e2a3941abc72456adeaa809739b6f30083344b5da56e93a7032, verify_jwt true, updated 2026-11-16 10:12:32 PM ET (BEFORE-function-list.txt, 42 functions).
Deploy: MCP deploy_edge_function by name save-push-subscription, entrypoint index.ts, verify_jwt true, files index.ts and handler.ts.
After: save-push-subscription v31, ezbr fddfbb09ca1bb8b0f6d94c28bd640da3fe1f69a7b26e250487f08a34df525e28, verify_jwt true, updated 2026-11-24 07:28:45 PM ET (AFTER-function-list.txt).
Diff of the lists (FUNCTION-LIST-DIFF.txt): 1 changed line, save-push-subscription only. The other 41 functions are unchanged (version, ezbr, verify_jwt, updated_at).
Readback (CLI download, read-only): index.ts 6e432a4f MATCH, handler.ts 4a3e98a3 MATCH.
Smoke 7:29:04 PM ET: POST without auth 401 (as before); OPTIONS 204 (the handler's own preflight status, unchanged code path). No authenticated call, no user row written.
Result: PASS.
Not touched: WEB_PUSH_SEND and every other secret, VAPID, crons, 7c71e421, 076ce453.
Rollback: deploy_edge_function project cqzvqzwwevnflinxgnpp, name save-push-subscription, entrypoint index.ts, verify_jwt true, files rollback/live-v30/index.ts (73f8d748) and rollback/live-v30/handler.ts (4a3e98a3) (= commit c168bcd1), then list_edge_functions before/after and CLI readback.
