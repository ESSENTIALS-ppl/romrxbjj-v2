-- P1-25 storage drain cron (OPTIONAL, UNAPPLIED, BUILD ONLY). Own pin, Vera precheck and release required.
-- Apply ONLY after (1) 20261117120000_p1_25_purge_storage_queue is applied (the queue table must exist) and
-- (2) the edge function p1-25-storage-drain is deployed (--no-verify-jwt; gate is x-cron-secret).
-- Adds one job (live count goes from the count read at apply time to that count + 1). Jobs 1 to 16 are not changed.
-- '53 4 * * *' UTC = 30 minutes after job 14 ('23 4 * * *'): 11:53 PM ET in EST, 12:53 AM ET in EDT.
-- The HTTP call is made only when the queue holds at least one row; on an empty queue nothing is called.
select cron.schedule(
  'p1-25-storage-drain-daily',
  '53 4 * * *',
  $cmd$select public.cron_call_edge('p1-25-storage-drain', 120000) where exists (select 1 from public.p1_25_storage_delete_queue)$cmd$
);
