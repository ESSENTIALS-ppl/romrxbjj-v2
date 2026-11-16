-- Minimal stub of live objects the P1-07 migration touches (FK actions read from live, read-only, Nov 15 2026).
create role anon; create role authenticated; create role service_role;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- live: users_id_auth_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
create table public.users (id uuid primary key references auth.users(id) on delete cascade);
-- live: assessments_user_id_fkey ... REFERENCES users(id) ON DELETE CASCADE
create table public.assessments (id uuid primary key, user_id uuid not null references public.users(id) on delete cascade, assessed_at timestamptz not null default now());
-- live: joint_scores_assessment_id_fkey ... ON DELETE CASCADE
create table public.joint_scores (id serial primary key, assessment_id uuid references public.assessments(id) on delete cascade);
-- live: notification_preferences.timezone (the lifecycle-emails time zone source)
create table public.notification_preferences (user_id uuid primary key references public.users(id) on delete cascade, timezone text);
-- pg_cron stub (PGlite has no pg_cron). Seeded with live jobs 1-12 as read Nov 15 2026 ~9:47 PM ET (read only).
-- Commands are NOT copied (they can hold secrets); each seeded command is a placeholder carrying the live md5(command).
create schema cron;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text not null, command text not null, active boolean not null default true);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (p_name, p_schedule, p_command) returning jobid $$;
create function cron.unschedule(p_name text) returns boolean language sql as $$
  with d as (delete from cron.job where jobname = p_name returning 1) select exists (select 1 from d) $$;
insert into cron.job (jobid, jobname, schedule, command, active) values
 (1,'send-renewal-reminders-daily','0 12 * * *','live md5 caab15b0a3b771bccfd127f7c3db4df2',true),
 (2,'s1-2-followup-email-hourly','0 * * * *','live md5 96ffa790027acd45313edf20e6612677',false),
 (3,'s1-3-masters-email-hourly','0 * * * *','live md5 5c632dc347104173f09055083687f2b0',false),
 (4,'s1-4-stillhere-email-hourly','0 * * * *','live md5 053dbb8f4ed2270b0cd3217179f09cfa',false),
 (5,'bb-s1-2-followup-email-hourly','0 * * * *','live md5 f0aefa2f88c94e80935601390d44ec2d',false),
 (6,'bb-s1-3-followup-email-hourly','0 * * * *','live md5 84dcb7331405342a57af8fc0c73d2fb5',false),
 (7,'bb-s1-4-stillhere-email-hourly','0 * * * *','live md5 e3612627db468c64852a7fa730ce4146',false),
 (8,'conversion-drip-hourly','15 * * * *','live md5 5a228f65f8009616ea9c2760119c1845',true),
 (9,'consent-events-retention-daily','17 4 * * *','live md5 a7ee748b979d9d3fd61d8cf8d3bc09ff',true),
 (10,'ai-chat-retention-90d-daily','17 8 * * *','live md5 1760ebc6aa9483d0d329e563df706858',true),
 (11,'lifecycle-emails-hourly','30 * * * *','live md5 a40ec3691de43187cbfb5b3061fd2519',true),
 (12,'assessment-drafts-purge-hourly','17 * * * *','live md5 15fc1f98d9fd7dab332077448c912d00',true);
select setval('cron.job_jobid_seq', 12);
