# P1-22 T10 (completions double-count): STOPPED, question for Grant. Not built. 2026-11-16 ~10:12 AM ET (Avery)

Nothing built, committed, applied or deployed. Read-only MCP SELECTs only.

## What T10 double-counts (clear from the files)
Sources: Reid MEASUREMENT-PLAN.md section 8 item 3; P1-22/fk-safe-20261115/BUILD-NOTE-20261115.md "Open issue (not fixed; needs a decision)"; the T10_INFO test in fk-safe and distinct-days results.json.
- The Base web writer 41b947e7 (romrx-io-web) saves the protocol_sessions row FIRST. Then it inserts up to 3 per-movement protocol_completions rows, with exercise_id set and **no protocol_session_id**.
- The live trigger zz_pc_protocol_session fires on the session insert, before the writer rows exist. It writes 1 session-level row (exercise_id NULL, protocol_session_id = session).
- Result: 1 + N rows (up to 4) for one session. Raw protocol_completions row counts, and the completion arm of ops.value_actions, overstate use. M1 is not affected (it uses EXISTS).

## Live today (counts only)
protocol_completions has 22 rows: all 22 session-level, 0 writer rows, 0 with no session id. 22 distinct sessions; protocol_sessions has 24 rows. **The writer is not live yet, so no doubles exist today.** T10 starts when 41b947e7 ships.

## Why I stopped: the fix scope is a decision the files leave open
The files name two options, and Grant's ruling ("report completion days, not rows, until the T10 fix ships") doesn't say which one is the T10 fix. They change different things:
1. **Row-level fix** (rows become trustworthy). This can't be done in the DB alone without deleting rows, because the trigger row is written before the writer rows arrive.
   - 1a. App change in romrx-io-web: the writer calls record_protocol_completions(p_session_id, …). On its own this still leaves the trigger's NULL row, since the live RPC only dedupes the same exercise_id. So it also needs the RPC to remove that session's fallback row when it inserts exercise rows. That is a DB change plus a web deploy (Jules's lane).
   - 1b. DB-only: an AFTER INSERT trigger on protocol_completions. When a writer row lands for a user and local date, it deletes the fallback (exercise_id NULL, trigger-made) row for that user and date. This deletes live rows on every Mark Complete.
2. **Metric-level fix** (rows stay as they are, metrics count user + local day): ops.protocol_completion_days, with ops.value_actions' completion arm reading it, plus ops.retention_m3. This is the distinct-days build 7c10d6fb. It was built inside the unapplied 040000 file, so it would need re-basing as a standalone migration on live 030659 (e.g. 20261116151000). No data changes. M1 answers are unchanged (tested T11e).

## Question
Which one is "the T10 fix": (2) metric-level, which I'd recommend as the smallest standalone with no data deletes and no app deploy; (1b) DB delete-on-writer-insert; or (1a) writer plus RPC (needs Jules)? Once Grant names one, I build it standalone on live with tests and a receipt.
