-- 20261117010100_p1_25_completion_cleanup_rollback.sql (UNAPPLIED; BUILD ONLY). P1-25 v4.
-- Drops the four completion-hook functions. Does not restore any row already erased by an apply-mode
-- completion (there is no backup at completion by design). After this, completion is manual SQL again
-- per the privacy runbook section A.
DROP FUNCTION IF EXISTS public.p1_25_complete_account_deletion(uuid, text);
DROP FUNCTION IF EXISTS public.p1_25_cleanup_at_completion(uuid, text);
DROP FUNCTION IF EXISTS public.p1_25_account_emails(uuid);
DROP FUNCTION IF EXISTS public.p1_25_exclusion_class(uuid);
