# RECEIPT: P1-22 v2 revoke anon EXECUTE APPLIED as 20261117012431

Written Monday Nov 16, 2026, 8:25 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push). Applied the exact SQL bytes of 15d074fc (sha256 1ed192abe7c92c34f0610d4b1c60ddf903f2aead4a41cd02a5abaa03d9b468f1, 3961 bytes). Never 72d57ad9. Never SQL 81af8e0. Never re-applied a34aa573. No data rows written or deleted. Standby rollback 0d839238 was not applied. No secrets or user emails in this receipt or in the applied SQL. main was not touched. Account 7c71e421 was not touched. EXPORT_MY_DATA was not changed. The renewal cron (job 1) was not touched. Never re-apply this migration.

## Gate (verified before any apply)

- Ledger L1031 (Jim: "Do all of them"); L1229 (Jim, 7:54 PM ET: "I said go on all 31 things").
- L1253 (ledger line 1627, 8:19 PM ET): SHA GATE PIN of romrxbjj-v2 15d074fc on fix/p1-22-revoke-anon-execute-v2-20261116, parent a34aa573 (origin/main), SQL 1ed192ab, rollback 0d839238.
- L1261 (ledger line 1643, 8:22 PM ET): SHA GATE RE-PIN of tip 6311f301 (tests-only commit on top of 15d074fc; SQL bytes unchanged).
- L1262 (ledger line 1645, 8:22 PM ET): PRECHECK VERIFIED. Vera /workspace/vera-verdicts/vera-15d074fc-P1-22-v2-recheck-20261116.md (d411b999). Apply pin: the migration bytes of 15d074fc (1ed192ab), never 72d57ad9, through MCP, then a pure rename to the MCP apply id.
- L1265 (ledger line 1651, 8:22 PM ET): SABLE GO. Grant relayed Vera VERIFIED v2 (d411b999) and the apply instruction.
- On-disk in worktree /workspace/p1-22-revoke-anon-execute-v2-20261116, immediately before apply (all MATCH):
  - Branch fix/p1-22-revoke-anon-execute-v2-20261116 tip **6311f3016dfbf7103e685af232189aca371194ee** (origin ls-remote confirmed after fetch).
  - 15d074fcc27bbf7fa6fd22807c87848d17f1cb20 parent **a34aa573a160c674cfdf9660cec30304161f1044**.
  - sha256 of 15d074fc:supabase/migrations/20261117020000_p1_22_revoke_anon_execute.sql = **1ed192abe7c92c34f0610d4b1c60ddf903f2aead4a41cd02a5abaa03d9b468f1** (3961 bytes).
  - sha256 of 15d074fc:supabase/migrations/20261117020000_p1_22_revoke_anon_execute.rollback.sql.txt = **0d839238b643b43b2c6ef97e77dcd34548b47065e19cbbae1b76f23c0fb5e363**.

## Pre-snapshot (read-only, immediately before apply, 8:24 PM ET)

- list_migrations head: **20261117010702** p1_18_assessment_feedback. Immediately prior: 20261117010651 p1_18_session_feedback, then 20261117001014 p1_22_t10_completions_by_day. No p1_22_revoke_anon_execute, and no 20261117020000 or 20261116040600.
- EXECUTE grants via has_function_privilege and pg_proc.proacl (verbatim):

```
schema_name | function_name | identity_args | regprocedure | proacl | anon_execute | authenticated_execute | service_role_execute | public_execute | postgres_execute
ops | is_excluded_from_metrics | p_user_id uuid | ops.is_excluded_from_metrics(uuid) | {postgres=X/postgres,service_role=X/postgres} | false | false | true | false | true
public | product_event_kind | p_event text | product_event_kind(text) | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | true | true | true | false | true
public | record_protocol_completions | p_session_id uuid, p_assessment_id uuid, p_joint text, p_exercise_ids uuid[] | record_protocol_completions(uuid,uuid,text,uuid[]) | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | true | true | true | true | true
public | tg_protocol_session_completion |  | tg_protocol_session_completion() | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | true | true | true | true | true
```

These match the live grants documented in the 15d074fc SQL comments (read 2026-11-15 10:21 PM ET, after 20261116030659).

## Apply (MCP apply_migration only, exact file substitution of the pinned 1ed192ab bytes)

- project_id cqzvqzwwevnflinxgnpp, name `p1_22_revoke_anon_execute`, query = the 3961-byte file sha 1ed192ab…. Success.
- Live id **20261117012431** p1_22_revoke_anon_execute. Time: Monday Nov 16, 2026, **8:24:31 PM ET** (version timestamp 2026-11-17 01:24:31 UTC). MCP assigned the id; repo filename 20261117020000 was not forced.
- 72d57ad9 was not applied.

## (1) Standby rollback (not applied)

- Rollback **0d839238b643b43b2c6ef97e77dcd34548b47065e19cbbae1b76f23c0fb5e363**. After the rename it lives at `supabase/migrations/20261117012431_p1_22_revoke_anon_execute.rollback.sql.txt` on fix/p1-22-revoke-anon-execute-v2-20261116. Apply a rollback only via MCP apply_migration with its own gate.

## (2) New migration head

- list_migrations after apply: one new row. Head **20261117012431** p1_22_revoke_anon_execute, immediately after the previous head **20261117010702** p1_18_assessment_feedback.

## (3) Grants after apply (read-only, 8:24:32 PM ET), verbatim

```
schema_name | function_name | identity_args | regprocedure | proacl | anon_execute | authenticated_execute | service_role_execute | public_execute | postgres_execute
ops | is_excluded_from_metrics | p_user_id uuid | ops.is_excluded_from_metrics(uuid) | {postgres=X/postgres,service_role=X/postgres} | false | false | true | false | true
public | product_event_kind | p_event text | product_event_kind(text) | {postgres=X/postgres,service_role=X/postgres} | false | false | true | false | true
public | record_protocol_completions | p_session_id uuid, p_assessment_id uuid, p_joint text, p_exercise_ids uuid[] | record_protocol_completions(uuid,uuid,text,uuid[]) | {postgres=X/postgres,service_role=X/postgres} | false | false | true | false | true
public | tg_protocol_session_completion |  | tg_protocol_session_completion() | {postgres=X/postgres,service_role=X/postgres} | false | false | true | false | true
```

Expected outcome: anon can no longer EXECUTE the three public P1-22 functions (product_event_kind, record_protocol_completions, tg_protocol_session_completion). PUBLIC EXECUTE is also gone on the two that had it. service_role and postgres still have EXECUTE on all four, including the already-revoked ops.is_excluded_from_metrics (proacl unchanged). authenticated EXECUTE was revoked on the three public functions because the SQL itself does that (unused authenticated grant); it was already false on ops.is_excluded_from_metrics.

## Rename (repo only, pure rename)

- On fix/p1-22-revoke-anon-execute-v2-20261116, commit **0863bb183f4b4f39ced5e5c7d61aedadc6460b2e** (plain push; origin ls-remote MATCH at 8:25 PM ET). Parent 6311f3016dfbf7103e685af232189aca371194ee. New tip **0863bb183f4b4f39ced5e5c7d61aedadc6460b2e**. main not updated. numstat 0/0, 100% rename, sha256 unchanged:
  - `supabase/migrations/20261117020000_p1_22_revoke_anon_execute.sql` → `supabase/migrations/20261117012431_p1_22_revoke_anon_execute.sql` (1ed192ab…)
  - `supabase/migrations/20261117020000_p1_22_revoke_anon_execute.rollback.sql.txt` → `supabase/migrations/20261117012431_p1_22_revoke_anon_execute.rollback.sql.txt` (0d839238…)
- Never re-apply.

## Not done

- Rollback 0d839238 was not applied. 72d57ad9 was not applied. EXPORT_MY_DATA was not flipped. No test submit, no emails sent, no accounts created, no deletes. P1-25 server apply and the P1-23 export-on condition were not part of this apply.
