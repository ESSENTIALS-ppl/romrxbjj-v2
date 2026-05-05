-- ============================================================
-- Migration 004: technique_eligibility + latest view
-- Populated by compute-tiers edge function on assessment INSERT
-- ============================================================

create table if not exists public.technique_eligibility (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athletes(id) on delete cascade,
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  technique_code  text not null,
  tier            text not null check (tier in ('GREEN','YELLOW','RED')),
  limiting_joints jsonb not null default '[]'::jsonb,
  computed_at     timestamptz not null default now()
);

alter table public.technique_eligibility enable row level security;

-- athletes can read their own tiers
create policy "eligibility_select_own"
  on public.technique_eligibility for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = technique_eligibility.athlete_id
        and a.user_id = auth.uid()
    )
  );

-- coaches can read tiers for their athletes
create policy "coaches_select_eligibility"
  on public.technique_eligibility for select
  using (
    exists (
      select 1
      from public.athletes a
      join public.coaches c on c.id = a.coach_id
      where a.id = technique_eligibility.athlete_id
        and c.user_id = auth.uid()
    )
  );

-- service_role bypass (edge function inserts via service_role)
create policy "eligibility_service_role_all"
  on public.technique_eligibility for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index eligibility_athlete_id_idx    on public.technique_eligibility(athlete_id);
create index eligibility_assessment_id_idx on public.technique_eligibility(assessment_id);
create index eligibility_technique_idx     on public.technique_eligibility(technique_code);
create index eligibility_tier_idx          on public.technique_eligibility(tier);

-- ── Latest tier per athlete per technique (instant reads) ──
create or replace view public.latest_technique_eligibility as
select distinct on (athlete_id, technique_code)
  id,
  athlete_id,
  assessment_id,
  technique_code,
  tier,
  limiting_joints,
  computed_at
from public.technique_eligibility
order by athlete_id, technique_code, computed_at desc;
