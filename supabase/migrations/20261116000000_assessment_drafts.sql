-- Assessment progress drafts. PROPOSED, NOT APPLIED. Needs Vera VERIFIED, Stacy answer (ruling Oct 28, 12:40 PM ET), Jim's go.
-- One live draft row per user. Holds only the same 18 ROM joint numbers the assessment already collects,
-- which step is done, and the step the user was on. No name, email, mood, sport, consent or device data.
-- Retention (Stacy ruling Oct 28): rolling 48 hours from the last save, hard cap 7 days from created_at.
-- Both limits are enforced here: the BEFORE trigger sets expires_at, a CHECK pins the cap, the purge deletes both kinds.
-- Rollback: 20261116000000_assessment_drafts.rollback.sql.txt (safe on its own: it drops the clear-on-submit trigger first; cron rollback first is still the tidy order).

create table if not exists public.assessment_drafts (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  step_values      jsonb not null default '{}'::jsonb,
  completed_steps  text[] not null default '{}',
  step_idx         smallint not null default 0,
  client_saved_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '48 hours'
);

-- Only the 18 existing field keys, numbers 0..360 or null, 2000 bytes max.
create or replace function public.assessment_draft_values_ok(v jsonb)
returns boolean language sql immutable set search_path = pg_catalog, pg_temp as $$
  select jsonb_typeof(v) = 'object'
     and pg_column_size(v) <= 2000
     and not exists (
       select 1 from jsonb_each(v) e
       where e.key <> all (array[
         'hip_er_l','hip_er_r','hip_ir_l','hip_ir_r',
         'shoulder_er_l','shoulder_er_r','shoulder_flex_l','shoulder_flex_r',
         'cervical_lat_l','cervical_lat_r','cervical_flex','cervical_ext',
         'hip_flex_l','hip_flex_r','hip_abd_l','hip_abd_r','ankle_df_l','ankle_df_r'])
          or not (case jsonb_typeof(e.value)
                    when 'null' then true
                    when 'number' then (e.value #>> '{}')::numeric between 0 and 360
                    else false end)
     );
$$;

alter table public.assessment_drafts
  add constraint assessment_drafts_values_ok check (public.assessment_draft_values_ok(step_values)),
  add constraint assessment_drafts_steps_ok check (
    completed_steps <@ array['hip_er','hip_ir','shoulder_er','shoulder_flex','cervical_lat',
                             'cervical_flex_ext','hip_flex','hip_abd','ankle_df']::text[]),
  add constraint assessment_drafts_step_idx_ok check (step_idx between 0 and 8),
  -- Stacy Oct 28: rolling 48 hours from the last save (updated_at), never past 7 days from created_at.
  add constraint assessment_drafts_rolling_48h_ok check (expires_at <= updated_at + interval '48 hours'),
  add constraint assessment_drafts_hard_cap_7d_ok check (expires_at <= created_at + interval '7 days');

alter table public.assessment_drafts enable row level security;

create policy assessment_drafts_select_own on public.assessment_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy assessment_drafts_insert_own on public.assessment_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy assessment_drafts_update_own on public.assessment_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy assessment_drafts_delete_own on public.assessment_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Prod default ACLs auto-grant ALL (including TRUNCATE, which ignores RLS) to anon and authenticated.
-- Strip first, then grant exactly what the app needs. No TRUNCATE, no REFERENCES, no TRIGGER.
revoke all on public.assessment_drafts from anon;
revoke all on public.assessment_drafts from authenticated;
grant select, insert, update, delete on public.assessment_drafts to authenticated;

-- Timestamps are set by the database, never trusted from the app.
--   insert: created_at = updated_at = now().
--   update: created_at is kept, unless the old row was already expired (48 hours or 7 days passed, purge not run yet):
--           then this save starts a new draft and created_at restarts, so the 7 day cap runs from the new draft.
--   expires_at = least(updated_at + 48 hours, created_at + 7 days), every time.
create or replace function public.assessment_drafts_touch()
returns trigger language plpgsql set search_path = pg_catalog, pg_temp as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  elsif old.expires_at <= now() then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.expires_at := least(now() + interval '48 hours', new.created_at + interval '7 days');
  return new;
end $$;
revoke all on function public.assessment_drafts_touch() from public, anon, authenticated;

create trigger assessment_drafts_touch_biu
  before insert or update on public.assessment_drafts
  for each row execute function public.assessment_drafts_touch();

-- Purge function (called by pg_cron, same style as purge_ai_chats_90d). Deletes past-48-hours and past-7-day rows.
create or replace function public.purge_assessment_drafts_48h()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.assessment_drafts
   where expires_at < now()
      or created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_assessment_drafts_48h() from public, anon, authenticated;
