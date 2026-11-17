-- P1-34 snapshot, READ ONLY (execute_sql). Run right before the flip, again after the next :30 run, and again after the first send.
-- Counts only: no email, name, token or secret is selected.
-- 1) cron fingerprint (same formula as the P1-08/P1-17 receipts, a96d2036 pre-flip) and the job list
select now() as read_at,
  (select md5(string_agg(jobid::text||'|'||schedule||'|'||command||'|'||active::text, E'\n' order by jobid)) from cron.job) as cron_md5,
  (select count(*) from cron.job) as jobs,
  (select json_agg(json_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active,'cmd_md5',md5(command)) order by jobid) from cron.job) as job_list;
-- 2) email_sends before/after
select now() as read_at, count(*) as email_sends, max(sent_at) as newest_sent_at,
  count(*) filter (where email_id like 'lc-%') as lifecycle_claims,
  count(*) filter (where email_id like 'checkin-d3-email-%') as checkin_email_claims,
  count(*) filter (where email_id like 'checkin-d3-%' and email_id not like 'checkin-d3-email-%') as checkin_note_claims
from public.email_sends;
-- 3) what the live functions say about their switches (latest cron responses; counts only)
select id, created, status_code,
  (content::jsonb)->>'dry_run' as dry_run, (content::jsonb)->>'send_enabled' as send_enabled,
  (content::jsonb)->>'email_enabled' as email_enabled, (content::jsonb)->>'audience' as audience,
  (content::jsonb)->>'canary_count' as canary_count, (content::jsonb)->>'note' as note,
  (content::jsonb)->'results' as results_counts
from net._http_response
where content like '{"success":true%' and (content like '%"kinds"%' or content like '%"results"%' or content like '%"notes"%' or content like '%canary%')
order by created desc limit 6;
-- 4) who could be targeted (customers only; 7c71e421 and test/internal accounts shown only as excluded counts)
with u as (select u.id, u.base_status, (u.id::text like '7c71e421%') as is_7c, coalesce(public.is_test_account(u.email), true) as is_test from public.users u),
p as (select n.*, u.is_7c, u.is_test from public.notification_preferences n join u on u.id = n.user_id)
select now() as read_at,
  (select count(*) from u where is_7c) as excluded_7c71e421,
  (select count(*) from u where is_test and not is_7c) as excluded_test_internal,
  (select count(*) from p where not is_7c and not is_test and retest_reminders and retest_opt_in_at is not null) as retest_check7_check14_optin,
  (select count(*) from p where not is_7c and not is_test and email_reminders and protocol_opt_in_at is not null) as protocol_lapsed_checkin_email_optin,
  (select count(*) from p where not is_7c and not is_test and weekly_digest and digest_opt_in_at is not null) as digest_optin,
  (select count(*) from u where not is_7c and not is_test and base_status = 'active') as base_active_customers,
  (select count(distinct a.user_id) from public.assessments a join u on u.id = a.user_id
     where not u.is_7c and not u.is_test and u.base_status = 'active' and a.assessed_at between now() - interval '5 days' and now() - interval '2 days') as checkin_note_window_users;
-- Fixture 076ce453 is frozen and is not a public.users row; it is never selected here.
