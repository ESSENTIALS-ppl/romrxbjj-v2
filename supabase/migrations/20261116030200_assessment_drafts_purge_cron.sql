-- Hourly purge of expired assessment drafts. PROPOSED, NOT APPLIED. Needs the table migration first.
-- A draft can sit up to about 49 hours before the purge runs; the app ignores expired rows meanwhile.
-- Before scheduling run the read-only dry check: select count(*) from public.assessment_drafts where expires_at < now();
do $$
begin
  if exists (select 1 from cron.job where jobname = 'assessment-drafts-purge-hourly') then
    perform cron.unschedule('assessment-drafts-purge-hourly');
  end if;
end $$;

select cron.schedule(
  'assessment-drafts-purge-hourly',
  '17 * * * *',
  $$select public.purge_assessment_drafts_48h();$$
);
