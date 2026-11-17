-- P1-22 follow-up: revoke anon / PUBLIC (and unused authenticated) EXECUTE
-- on the P1-22 functions (Vera W1 on 5162a3c3).
-- Written 2026-11-15, Avery. Restamped 2026-11-16 as 20261117020000
-- on a new branch off origin/main (a34aa573). 72d57ad9 (parent 5366b22c,
-- filename 20261116040600) is left untouched: that parent is not on main
-- and 20261116040600 is older than live head 20261117010702.
-- Numbered 20261117020000 after live head 20261117010702
-- (p1_18_assessment_feedback) and after every current git-ref-tip
-- migration (repo max also 20261117010702). Unapplied P1-25 filenames
-- 20261117010000/10100/10200 are earlier. Obsolete pre-rename P1-18
-- process-pack names 20261117120000/120100 are not at any ref tip
-- (renamed to 20261117010651/010702 on ddefff93).
-- BUILD ONLY. Do not apply until Margot has a sha gate line and Vera's
-- precheck PASS, relayed by Grant. No live writes in this commit.
-- The real migration id is stamped at apply via MCP apply_migration;
-- 20261117020000 is the repo filename only.
--
-- Live EXECUTE grants read 2026-11-15 10:21 PM ET via execute_sql
-- (read-only) on project cqzvqzwwevnflinxgnpp, after 20261116030659:
--   ops.is_excluded_from_metrics(uuid)
--     proacl {postgres=X/postgres,service_role=X/postgres}
--     has_function_privilege: anon false, authenticated false,
--     service_role true, postgres true. Already revoked.
--   public.product_event_kind(text)
--     proacl {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--     no PUBLIC grant (030659 revoked PUBLIC; pg_default_acl still
--     granted anon and authenticated).
--   public.record_protocol_completions(uuid, uuid, text, uuid[])
--     proacl {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   public.tg_protocol_session_completion()
--     proacl {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- Client / edge evidence (no RPC caller for any of the four):
--   romrx-io-web 360510fe3a3d165d20fe11392715cfedec47eb9c (live):
--     no .rpc('record_protocol_completions'|product_event_kind|
--     tg_protocol_session_completion|is_excluded_from_metrics).
--     MyProtocol.tsx:582-586 upserts protocol_sessions; :610 inserts
--     protocol_completions directly (comment at :568).
--   romrxbjj-v2 5366b22c (edge functions and src): no .rpc of those
--     names. service_role and postgres keep EXECUTE on all four.

-- public.product_event_kind: no client or edge RPC. Used from ops
-- views as the view owner (postgres). Revoke PUBLIC, anon, authenticated.
REVOKE ALL ON FUNCTION public.product_event_kind(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_event_kind(text) TO service_role, postgres;

-- public.record_protocol_completions: live Base writer does not call
-- this RPC (MyProtocol.tsx inserts the table). No edge-function RPC.
-- authenticated EXECUTE is unused. Revoke PUBLIC, anon, authenticated.
REVOKE ALL ON FUNCTION public.record_protocol_completions(uuid, uuid, text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_protocol_completions(uuid, uuid, text, uuid[]) TO service_role, postgres;

-- public.tg_protocol_session_completion: trigger function. Caller
-- EXECUTE is not required for the trigger to fire on a session insert.
-- Revoke PUBLIC, anon, authenticated.
REVOKE ALL ON FUNCTION public.tg_protocol_session_completion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_protocol_session_completion() TO service_role, postgres;

-- ops.is_excluded_from_metrics: already service_role + postgres only
-- on live (030659 revoked PUBLIC, anon, authenticated). Idempotent.
REVOKE ALL ON FUNCTION ops.is_excluded_from_metrics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ops.is_excluded_from_metrics(uuid) TO service_role, postgres;
