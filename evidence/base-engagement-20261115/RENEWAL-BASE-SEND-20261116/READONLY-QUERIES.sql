-- RENEWAL-BASE-SEND fact sheet, READ ONLY (execute_sql SELECT only).
-- Counts, names, and safe http-log fields only. Do not SELECT emails, user ids
-- (except the standing 7c71e421 / 076ce453 exclusion flags), secret values, or raw http bodies.
-- Project cqzvqzwwevnflinxgnpp. Not a migration. Not applied as a change.

-- 1) cron fingerprint (same formula as P1-08/P1-17 receipts, expected a96d2036) and job 1
select now() at time zone 'America/New_York' as read_at_et,
  (select md5(string_agg(jobid::text||'|'||schedule||'|'||command||'|'||active::text, E'\n' order by jobid)) from cron.job) as cron_md5,
  (select count(*) from cron.job) as jobs,
  (select json_agg(json_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active,'cmd_md5',md5(command)) order by jobid) from cron.job) as job_list,
  (select json_build_object(
      'jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active,
      'command',command,'cmd_md5',md5(command),
      'row_md5',md5(jobid::text||'|'||jobname||'|'||schedule||'|'||command||'|'||active::text)
    )
   from cron.job where jobid = 1) as job1;

-- 2) vault names only (edge secrets are not stored here; 0 is not proof of absence)
select
  count(*) filter (where name = 'RENEWAL_BASE_SEND') as exact_name_count,
  count(*) filter (where name ilike '%renewal%') as name_contains_renewal_count
from vault.secrets;

-- 3) claim tables and recent job 1 runs (return_message is the cron_call_edge result, not the function body)
select
  (select count(*) from public.renewal_reminders) as renewal_reminders_rows,
  (select count(*) from public.email_sends) as email_sends_rows,
  (select count(*) from public.email_sends where email_id ilike '%renewal%') as email_sends_renewal_like,
  (select json_agg(x) from (
     select jobid, runid, status, left(return_message, 200) as return_message_head,
            start_time at time zone 'America/New_York' as start_et,
            end_time at time zone 'America/New_York' as end_et
     from cron.job_run_details
     where jobid = 1
     order by start_time desc
     limit 8
  ) x) as job1_recent_runs;

-- 4) http log: classify bodies without selecting content or any due/email fields
select
  now() at time zone 'America/New_York' as read_at_et,
  count(*) as http_response_rows,
  min(created) at time zone 'America/New_York' as oldest_et,
  max(created) at time zone 'America/New_York' as newest_et,
  count(*) filter (where timed_out) as timed_out_rows,
  count(*) filter (where content ilike '%send_enabled%') as bodies_with_send_enabled,
  count(*) filter (where content ilike '%days_until%') as bodies_with_days_until,
  count(*) filter (where content ilike '%charge_date%') as bodies_with_charge_date
from net._http_response;

select id,
  created at time zone 'America/New_York' as created_et,
  status_code, timed_out,
  (select array_agg(k order by k) from jsonb_object_keys(content::jsonb) as k) as top_keys,
  (content::jsonb)->>'send_enabled' as send_enabled,
  (content::jsonb)->>'dry_run' as dry_run,
  (content::jsonb)->>'audience' as audience,
  (content::jsonb) ? 'kinds' as has_kinds,
  (content::jsonb) ? 'days_until' as has_days_until_top,
  (content::jsonb) ? 'charge_date' as has_charge_date_top
from net._http_response
where content ilike '%send_enabled%'
order by created desc;

-- 5) due counts for Tue Nov 17 7:00 AM ET, replicating planReminders. Counts only.
with params as (
  select timestamptz '2026-11-17 12:00:00.3+00' as now_ts,
         (timezone('America/New_York', timestamptz '2026-11-17 12:00:00.3+00'))::date as today_ny
),
cand as (
  select u.id,
         (u.id::text like '7c71e421%') as is_7c,
         (u.id::text like '076ce453%') as is_076,
         coalesce(public.is_test_account(u.email), false) as is_test,
         (lower(split_part(u.email, '@', 2)) in ('romrx.io', 'romrxbjj.com', 'romrxbodybuilding.com')) as is_internal,
         u.active_sport, u.base_status,
         u.base_stripe_subscription_id is not null as has_base_sub,
         u.base_expiry, u.base_cancel_at_period_end, u.base_canceled_at,
         u.grandfathered_at, u.subscription_tier, u.subscription_expiry,
         u.stripe_subscription_id, u.marketing_opt_out
  from public.users u
  where u.base_status = 'active'
    and u.base_stripe_subscription_id is not null
),
charge as (
  select c.id,
    (
      select bc.trial_end
      from public.billing_consents bc
      join public.users u on u.id = c.id
      where bc.user_id = c.id
        and bc.stripe_subscription_id is not null
        and bc.stripe_subscription_id = u.base_stripe_subscription_id
        and coalesce(bc.offer,'') <> 'sport'
        and bc.trial_end is not null
        and bc.trial_end > (select now_ts from params)
      order by bc.trial_end desc
      limit 1
    ) as trial_end_future,
    c.base_expiry
  from cand c
),
charged as (
  select c.*,
    case
      when ch.trial_end_future is not null then ch.trial_end_future
      when ch.base_expiry is not null and ch.base_expiry > (select now_ts from params) then ch.base_expiry
      else null
    end as charge_at,
    case
      when c.grandfathered_at is not null then 'legacy_grandfathered'
      when lower(coalesce(c.subscription_tier,'')) in ('athlete','coach') then 'legacy_tier'
      when c.subscription_expiry is not null then 'legacy_pack_expiry'
      when c.stripe_subscription_id is not null then 'legacy_pack_subscription'
      when c.base_status is distinct from 'active' then 'base_not_active'
      when not c.has_base_sub then 'no_stripe_subscription'
      when coalesce(c.base_cancel_at_period_end,false) or c.base_canceled_at is not null then 'canceling'
      when c.is_test then 'test_fixture'
      when c.is_internal then 'internal'
      else null
    end as skip_reason
  from cand c
  join charge ch on ch.id = c.id
),
classified as (
  select d.*,
    case when d.charge_at is not null then (timezone('America/New_York', d.charge_at))::date end as charge_date_ny,
    case when d.charge_at is not null then
      ((timezone('America/New_York', d.charge_at))::date - (select today_ny from params))
    end as days_until
  from charged d
),
final as (
  select cl.*,
    case
      when cl.skip_reason is not null then cl.skip_reason
      when cl.charge_at is null then 'no_future_charge_date'
      when cl.days_until < 0 then 'not_in_window'
      when cl.days_until <= 2 then 'due_2_day'
      when cl.days_until <= 30 then 'due_30_day'
      when cl.days_until <= 45 then 'due_45_day'
      else 'not_in_window'
    end as bucket,
    case
      when lower(coalesce(cl.active_sport,'')) = 'bjj' then 'bjj'
      when lower(coalesce(cl.active_sport,'')) = 'bodybuilding' then 'bodybuilding'
      else 'base'
    end as brand
  from classified cl
)
select
  (select now_ts from params) as run_at_utc,
  (select today_ny from params) as today_ny,
  count(*) as candidate_rows,
  count(*) filter (where bucket = 'due_45_day') as due_45,
  count(*) filter (where bucket = 'due_45_day' and brand = 'base') as due_45_base,
  count(*) filter (where bucket = 'due_45_day' and brand = 'bjj') as due_45_bjj,
  count(*) filter (where bucket = 'due_45_day' and brand = 'bodybuilding') as due_45_bb,
  count(*) filter (where bucket = 'due_30_day') as due_30,
  count(*) filter (where bucket = 'due_2_day') as due_2,
  count(*) filter (where bucket like 'due_%') as due_total,
  count(*) filter (where bucket like 'due_%' and coalesce(marketing_opt_out,false)) as due_with_marketing_opt_out,
  count(*) filter (where bucket = 'legacy_grandfathered') as skip_legacy_grandfathered,
  count(*) filter (where bucket = 'test_fixture') as skip_test_fixture,
  count(*) filter (where bucket = 'internal') as skip_internal,
  count(*) filter (where bucket = 'canceling') as skip_canceling,
  count(*) filter (where bucket = 'no_future_charge_date') as skip_no_future_charge_date,
  count(*) filter (where bucket = 'not_in_window') as skip_not_in_window,
  count(*) filter (where is_7c) as candidates_7c71e421,
  count(*) filter (where is_7c and bucket like 'due_%') as due_7c71e421,
  max(case when is_7c then bucket end) as bucket_7c71e421,
  count(*) filter (where is_076) as candidates_076ce453,
  count(*) filter (where is_076 and bucket like 'due_%') as due_076ce453,
  (select array_agg(days_until order by days_until) from final where bucket like 'due_%') as due_days_until,
  (select array_agg(charge_date_ny::text order by charge_date_ny) from final where bucket like 'due_%') as due_charge_dates
from final;

-- 6) fixture 076ce453 presence (counts only; it is not a users row)
select
  (select count(*) from public.users where id::text like '076ce453%') as users_076ce453,
  (select count(*) from public.billing_consents where user_id::text like '076ce453%') as consents_076ce453,
  (select count(*) from public.renewal_reminders where user_id::text like '076ce453%') as reminders_076ce453;
