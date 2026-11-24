-- ROLLBACK for 20261124120000_p1_25_storage_drain_cron (UNAPPLIED). Removes only the drain job; no other job is touched.
select cron.unschedule('p1-25-storage-drain-daily');
