-- P1-25 daily queue-count check (read-only). Run once a day after public.p1_25_storage_delete_queue exists.
-- The queue column is queued_at (the enqueue time). escalate_to_grant is true when any row has waited more than 24 hours.
-- Log one line per run to process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-QUEUE-CHECK.log
select count(*)::int as queued,
       min(queued_at) as oldest_queued_at,
       (min(queued_at) at time zone 'America/New_York')::text as oldest_queued_at_et,
       coalesce(min(queued_at) < now() - interval '24 hours', false) as escalate_to_grant
from public.p1_25_storage_delete_queue;
