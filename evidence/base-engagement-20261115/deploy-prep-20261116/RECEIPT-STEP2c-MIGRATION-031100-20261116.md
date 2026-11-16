# PREP RECEIPT, Step 2c: migration 20261116031100_pe_assessment_inserted_quick (P1-06). PREP ONLY, NOT APPLIED.

Apply after 2b (it references new.check_kind).

## Source
- Tree 47aad435. File `supabase/migrations-unapplied/20261116031100_pe_assessment_inserted_quick.sql`, blob 1aa7d0b65b707d078fb893926bc9e15dc8ecf7b8, **sha256 `86095816ade33259e49d5a1f2e3db175da80e8e062c1be10490cb3bccf366e04`**, 1852 bytes, 29 lines. Added in 3b30ab57 (content unchanged from bda32302).

## What it does
`CREATE OR REPLACE FUNCTION public.tg_pe_assessment_inserted()` (the trigger zz_pe_assessment_inserted itself is unchanged). A quick row logs `quick_recheck_submitted` instead of `assessment_submitted`. prior_count and is_reassessment count full rows only. Full rows log exactly as before. Same signature, SECURITY DEFINER and search_path.

## Vs live (checked today)
Live `tg_pe_assessment_inserted()` (md5 of pg_get_functiondef `945c0e679cbc28a27fcd60d600a587c6`, saved in `schema-snapshots-20261116/live-defs-replaced-by-031100-031200.json`) is **byte-for-byte contained in the rollback file**. So the rollback is still the true live body and nothing changed it after Nov 15, including P1-22's 030659. The diff vs live is exactly the two-part change described above. See the file for the full body.

## Rollback
`20261116031100_pe_assessment_inserted_quick_rollback.sql` sha256 `9ab75234c3b1bfc23266c36cc2c43408dc475e13bed0d6b99b578e28738bf727` restores the live body verified today. Run it before the 031000 rollback.

## Apply command form
MCP `apply_migration`, name `pe_assessment_inserted_quick`, query = exact file bytes (86095816…).

## Rename after apply (pure-rename commit, repo only)
After apply, read the real version from `list_migrations`. Then, in /workspace/romrxbjj-v2, on a new branch from 47aad435, `git mv` the file and its rollback companion to `<REAL>_<same name>` in the same folder (`supabase/migrations-unapplied/`, the 5366b22c / 551643f pattern). Bytes unchanged. Confirm with `git show --name-status -M` = R100 for both. Plain push, no force. That commit records an apply that already happened and must never be re-applied. Byte check (L1085): the file sha256 must equal the applied bytes.

## Post-check plan (read-only)
1. `list_migrations`: +1.
2. `select md5(pg_get_functiondef('public.tg_pe_assessment_inserted()'::regprocedure));` Expect it to differ from 945c0e67… and the body to contain `quick_recheck_submitted`. `select tgname, tgenabled from pg_trigger where tgname='zz_pe_assessment_inserted';` Unchanged.
3. `select prosecdef, proconfig from pg_proc where oid='public.tg_pe_assessment_inserted()'::regprocedure;` Expect true, search_path=public.
4. No test insert (no write smoke without Jim's yes). Behavior is covered by p1-06-quick-test (PGlite 5/5, gating-pack evidence).

## Pre-apply ACL (today): tg_pe_assessment_inserted() proacl postgres/service_role EXECUTE, SECURITY DEFINER, search_path=public. Post-check: unchanged.
