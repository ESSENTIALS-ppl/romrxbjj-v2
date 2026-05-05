-- ============================================================
-- Migration 003: assessments
-- Full ROM measurement log per athlete
-- ============================================================

create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athletes(id) on delete cascade,
  assessed_by     uuid references public.coaches(id) on delete set null,
  belt_at_time    text not null default 'white'
                  check (belt_at_time in ('white','blue','purple','brown','black')),
  age_at_time     int,
  dominant_side   text not null default 'right'
                  check (dominant_side in ('right','left')),

  -- ── Cervical ──────────────────────────────────────────────
  cervical_flexion          numeric(5,1),
  cervical_extension        numeric(5,1),
  cervical_rotation_left    numeric(5,1),
  cervical_rotation_right   numeric(5,1),
  cervical_lateral_left     numeric(5,1),
  cervical_lateral_right    numeric(5,1),

  -- ── Shoulder ──────────────────────────────────────────────
  shoulder_flexion_left     numeric(5,1),
  shoulder_flexion_right    numeric(5,1),
  shoulder_abduction_left   numeric(5,1),
  shoulder_abduction_right  numeric(5,1),
  shoulder_er_left          numeric(5,1),
  shoulder_er_right         numeric(5,1),
  shoulder_ir_left          numeric(5,1),
  shoulder_ir_right         numeric(5,1),
  shoulder_extension_left   numeric(5,1),
  shoulder_extension_right  numeric(5,1),

  -- ── Elbow / Wrist ─────────────────────────────────────────
  elbow_flexion_left        numeric(5,1),
  elbow_flexion_right       numeric(5,1),
  elbow_extension_left      numeric(5,1),
  elbow_extension_right     numeric(5,1),
  wrist_flexion_left        numeric(5,1),
  wrist_flexion_right       numeric(5,1),
  wrist_extension_left      numeric(5,1),
  wrist_extension_right     numeric(5,1),

  -- ── Hip ───────────────────────────────────────────────────
  hip_flexion_left          numeric(5,1),
  hip_flexion_right         numeric(5,1),
  hip_extension_left        numeric(5,1),
  hip_extension_right       numeric(5,1),
  hip_abduction_left        numeric(5,1),
  hip_abduction_right       numeric(5,1),
  hip_adduction_left        numeric(5,1),
  hip_adduction_right       numeric(5,1),
  hip_er_left               numeric(5,1),
  hip_er_right              numeric(5,1),
  hip_ir_left               numeric(5,1),
  hip_ir_right              numeric(5,1),

  -- ── Knee ──────────────────────────────────────────────────
  knee_flexion_left         numeric(5,1),
  knee_flexion_right        numeric(5,1),
  knee_extension_left       numeric(5,1),
  knee_extension_right      numeric(5,1),

  -- ── Ankle ─────────────────────────────────────────────────
  ankle_dorsiflexion_left   numeric(5,1),
  ankle_dorsiflexion_right  numeric(5,1),
  ankle_plantarflexion_left numeric(5,1),
  ankle_plantarflexion_right numeric(5,1),
  ankle_inversion_left      numeric(5,1),
  ankle_inversion_right     numeric(5,1),
  ankle_eversion_left       numeric(5,1),
  ankle_eversion_right      numeric(5,1),

  -- ── Spine / Trunk ─────────────────────────────────────────
  lumbar_flexion            numeric(5,1),
  lumbar_extension          numeric(5,1),
  lumbar_rotation_left      numeric(5,1),
  lumbar_rotation_right     numeric(5,1),
  thoracic_rotation_left    numeric(5,1),
  thoracic_rotation_right   numeric(5,1),

  -- ── Meta ──────────────────────────────────────────────────
  raw_payload     jsonb,          -- full submission payload for debugging
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.assessments enable row level security;

-- athletes can read their own assessments
create policy "assessments_select_own"
  on public.assessments for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = assessments.athlete_id
        and a.user_id = auth.uid()
    )
  );

-- athletes can insert their own assessments
create policy "assessments_insert_own"
  on public.assessments for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = assessments.athlete_id
        and a.user_id = auth.uid()
    )
  );

-- coaches can read assessments for their athletes
create policy "coaches_select_assessments"
  on public.assessments for select
  using (
    exists (
      select 1
      from public.athletes a
      join public.coaches c on c.id = a.coach_id
      where a.id = assessments.athlete_id
        and c.user_id = auth.uid()
    )
  );

-- coaches can insert assessments for their athletes
create policy "coaches_insert_assessments"
  on public.assessments for insert
  with check (
    exists (
      select 1
      from public.athletes a
      join public.coaches c on c.id = a.coach_id
      where a.id = assessments.athlete_id
        and c.user_id = auth.uid()
    )
  );

-- service_role bypass
create policy "assessments_service_role_all"
  on public.assessments for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index assessments_athlete_id_idx on public.assessments(athlete_id);
create index assessments_created_at_idx on public.assessments(created_at desc);
