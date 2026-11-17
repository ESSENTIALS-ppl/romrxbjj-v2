-- 20261117010000_p1_25_purge_deleted_accounts_rollback.sql (UNAPPLIED; BUILD ONLY).
-- Drops public.purge_deleted_accounts. Does not unschedule any cron (none is scheduled by the
-- companion function file). Does not drop zz_bak_p1_25_* backup schemas and does not restore
-- rows already purged by an apply-mode run — see docs/p1-25/BACKUP-AND-ROLLBACK.md for that.
-- Not for apply until the function itself has been gated and applied.

DROP FUNCTION IF EXISTS public.purge_deleted_accounts(text, interval);
