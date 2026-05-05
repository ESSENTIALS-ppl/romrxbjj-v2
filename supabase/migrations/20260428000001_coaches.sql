-- ============================================================
-- Migration 001: coaches
-- Must run BEFORE athletes (athletes.coach_id FK)
-- ============================================================

create table if not exists public.coaches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'coach'
               check (role in ('headcoach','coach','assistant','admin')),
  gym_id       uuid,                          -- FK added later when gyms table exists
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.coaches enable row level security;

-- coaches can read their own row
create policy "coaches_select_own"
  on public.coaches for select
  using (auth.uid() = user_id);

-- coaches can update their own row
create policy "coaches_update_own"
  on public.coaches for update
  using (auth.uid() = user_id);

-- service_role bypass (admin reads)
create policy "coaches_service_role_all"
  on public.coaches for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger coaches_updated_at
  before update on public.coaches
  for each row execute function public.set_updated_at();

create unique index coaches_user_id_idx on public.coaches(user_id);
create index coaches_gym_id_idx on public.coaches(gym_id);
