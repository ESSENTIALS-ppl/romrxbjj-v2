# PREP RECEIPT, Step 2d: migration 20261116031200_skip_quick_reads (P1-06). PREP ONLY, NOT APPLIED.

Apply after 2c.

## Source
- Tree 47aad435. File `supabase/migrations-unapplied/20261116031200_skip_quick_reads.sql`, blob d1f93b24cdf3865a414ceab84a3927e0a041983a, **sha256 `46a2820fb4cdca4b3f7ef0d9f7ca1a7207e5d87dd1b9b6a896a46a28bb0fa325`**, 9651 bytes, 195 lines. Added in 3b30ab57 (content unchanged from bda32302).

## What it does
CREATE OR REPLACE of `get_my_profile()`, `my_joint_history(integer)`, `my_joint_start_vs_now()` and view `rombot_context` (security_invoker=true). Each latest/history assessment read gets one added filter, `check_kind IS DISTINCT FROM 'quick'`. Signatures, return types, SECURITY, search_path, grants and the view's columns are unchanged.

## Vs live (checked today)
The live definitions (md5 of pg_get_functiondef / viewdef): get_my_profile af3b19ae21d5d16512949201b0188c0f, my_joint_history 359f43d895b7573dcd3aa08c4cad57f8, my_joint_start_vs_now 66853d604051430b0b8eb9051d24511a, rombot_context viewdef a4acefe1709fa84e686a928ada9912d5, reloptions security_invoker=true. **Each is contained in the rollback file** (functions exact, view whitespace-normalized). So the rollback equals live today, and the migration differs from live only by the filter lines. Saved in `schema-snapshots-20261116/live-defs-replaced-by-031100-031200.json`.

## Rollback
`20261116031200_skip_quick_reads_rollback.sql` sha256 `3509746e8c3630821434b27a18dd7a01fc00e1dbff22ce54bbf0bd1b3066d9e6` restores the live definitions verified today. Run it before the 031000 rollback.

## Apply command form
MCP `apply_migration`, name `skip_quick_reads`, query = exact file bytes (46a2820f…).

## Rename after apply (pure-rename commit, repo only)
After apply, read the real version from `list_migrations`. Then, in /workspace/romrxbjj-v2, on a new branch from 47aad435, `git mv` the file and its rollback companion to `<REAL>_<same name>` in the same folder (`supabase/migrations-unapplied/`, the 5366b22c / 551643f pattern). Bytes unchanged. Confirm with `git show --name-status -M` = R100 for both. Plain push, no force. That commit records an apply that already happened and must never be re-applied. Byte check (L1085): the file sha256 must equal the applied bytes.

## Post-check plan (read-only)
1. `list_migrations`: +1 (183 after all four).
2. `select p.oid::regprocedure, md5(pg_get_functiondef(p.oid)), pg_get_functiondef(p.oid) like '%IS DISTINCT FROM ''quick''%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_my_profile','my_joint_history','my_joint_start_vs_now');` Expect all true and md5 changed. `select pg_get_viewdef('public.rombot_context'::regclass,true) like '%quick%', reloptions from pg_class where oid='public.rombot_context'::regclass;` Expect true and security_invoker=true.
3. `select grantee, privilege_type from information_schema.routine_privileges where routine_name in ('get_my_profile','my_joint_history','my_joint_start_vs_now') order by 1;` Compare with a pre-apply read of the same query, taken by Vera at precheck.
4. No signed-in call (no cleared account). Covered by p1-06-quick-reads PGlite 12/12 (gating-pack evidence).

## Pre-apply ACL snapshot (taken today, `schema-snapshots-20261116/pre-apply-acls-20261116.json`)
get_my_profile: PUBLIC/postgres/authenticated/service_role EXECUTE. my_joint_history and my_joint_start_vs_now: postgres/authenticated/service_role. rombot_context: anon/authenticated/service_role all privileges, security_invoker=true (so RLS on base tables applies). These are pre-existing and not changed by this file (CREATE OR REPLACE keeps ACLs). Post-check: the same proacl/relacl must come back.
