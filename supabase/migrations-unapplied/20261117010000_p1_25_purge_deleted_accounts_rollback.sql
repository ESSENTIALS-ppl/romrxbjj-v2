-- 20261117010000_p1_25_purge_deleted_accounts_rollback.sql (UNAPPLIED; BUILD ONLY). v3.
-- Drops public.purge_deleted_accounts (same signature as v1/v3: text, interval).
-- Does not unschedule any cron (none is scheduled by the companion function file).
-- Does not drop zz_bak_p1_25_* backup schemas, does not restore rows already purged by an
-- apply-mode run, and does not undo a 7-day backup drop — see docs/p1-25/BACKUP-AND-ROLLBACK.md.
-- Not for apply until the function itself has been gated and applied.

DROP FUNCTION IF EXISTS public.purge_deleted_accounts(text, interval);
