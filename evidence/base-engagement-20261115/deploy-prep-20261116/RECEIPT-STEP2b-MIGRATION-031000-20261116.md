# PREP RECEIPT, Step 2b: migration 20261116031000_assessment_check_kind (P1-06). PREP ONLY, NOT APPLIED.

Apply after 2a is live and post-checked. Step 6 (client 8bf3d601) depends on this one.

## Source
- Tree 47aad435 (parent 832056dd). File `supabase/migrations-unapplied/20261116031000_assessment_check_kind.sql`, blob 7dd33c1c3de3ec8824061e9395bab220fb7ae45b, **sha256 `302dd0cccb479f67098e881325b148e8c37081a601d90b01de30315d500b43e6`**, 1042 bytes, 20 lines. Added in 170e1bca (content unchanged from 65c3a036).

## What it does
`alter table public.assessments add column if not exists check_kind text not null default 'full'`. Existing 22 rows get 'full'. It adds check constraint `assessments_check_kind_chk` (full, quick) and index `assessments_user_check_kind_assessed_at_idx (user_id, check_kind, assessed_at desc)`.

## Vs live
Additive. Live: check_kind column 0, constraint 0. The assessments indexes are the 6 listed in the snapshot (none with this name). Triggers: assessments, assessments_clear_draft_ai, trg_assessments_autofill_athlete_id, zz_pe_assessment_inserted. Adding a NOT NULL column with a constant default is a metadata-only change on PG ≥ 11. The table has 22 rows.

## Rollback
`20261116031000_assessment_check_kind_rollback.sql` sha256 `d5bf1c287b5186d20b79b63a1d586ead06f1d2a5130e9935a4c22dc0642d25c3` drops the index, the constraint and the column. Roll back 031200 and 031100 FIRST (both reference check_kind). After this apply, rolling back also needs client 8bf3d601 not live, or its skipQuick reads error. Rolled-back quick rows would lose their 'quick' marker; there are 0 today, since nothing sends quick while QUICK_CHECK_ON is false.

## Apply command form
MCP `apply_migration`, name `assessment_check_kind`, query = exact file bytes (302dd0cc…).

## Rename after apply (pure-rename commit, repo only)
After apply, read the real version from `list_migrations`. Then, in /workspace/romrxbjj-v2, on a new branch from 47aad435, `git mv` the file and its rollback companion to `<REAL>_<same name>` in the same folder (`supabase/migrations-unapplied/`, the 5366b22c / 551643f pattern). Bytes unchanged. Confirm with `git show --name-status -M` = R100 for both. Plain push, no force. That commit records an apply that already happened and must never be re-applied. Byte check (L1085): the file sha256 must equal the applied bytes.

## Post-check plan (read-only)
1. `list_migrations`: +1, name assessment_check_kind.
2. `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='assessments' and column_name='check_kind';` Expect text, NO, 'full'::text.
3. `select check_kind, count(*) from public.assessments group by 1;` Expect full = 22 (or the current total), quick 0.
4. `select conname from pg_constraint where conname='assessments_check_kind_chk'; select indexname from pg_indexes where indexname='assessments_user_check_kind_assessed_at_idx';` One row each.
5. Cron jobs 1 to 13 md5 unchanged.
