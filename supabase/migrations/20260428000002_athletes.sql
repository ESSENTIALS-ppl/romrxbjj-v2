-- ============================================================
-- Migration 002: athletes
-- Synced from auth.users via handle_new_user trigger
-- ============================================================

create table if not exists public.athletes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  belt            text not null default 'white'
                  check (belt in ('white','blue','purple','brown','black')),
  dominant_side   text not null default 'right'
                  check (dominant_side in ('right','left')),
  age             int,
  injury_flags    jsonb not null default '[]'::jsonb,
  coach_id        uuid references public.coaches(id) on delete set null,
  gym_id          uuid,
  onboarding_status text not null default 'pending_consent'
                  check (onboarding_status in
                    ('pending_consent','consent_signed','assessment_in_progress','active')),
  terms_accepted_at        timestamptz,
  medical_waiver_accepted_at timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.athletes enable row level security;

-- athletes can read their own row
create policy "athletes_select_own"
  on public.athletes for select
  using (auth.uid() = user_id);

-- athletes can update their own row
create policy "athletes_update_own"
  on public.athletes for update
  using (auth.uid() = user_id);

-- coaches can read their own athletes
create policy "coaches_select_athletes"
  on public.athletes for select
  using (
    exists (
      select 1 from public.coaches c
      where c.user_id = auth.uid()
        and c.id = athletes.coach_id
    )
  );

-- service_role bypass
create policy "athletes_service_role_all"
  on public.athletes for all
  using (auth.jwt() ->> 'role' = 'service_role');

create trigger athletes_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

create unique index athletes_user_id_idx on public.athletes(user_id);
create index athletes_coach_id_idx on public.athletes(coach_id);
create index athletes_belt_idx on public.athletes(belt);

-- ============================================================
-- Auto-create athlete row on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.athletes (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
