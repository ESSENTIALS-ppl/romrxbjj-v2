-- ============================================================
-- Migration 005: consents table + onboarding status
-- ============================================================

create table if not exists public.consents (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  terms_version           text not null,          -- e.g. '2026-05-04'
  medical_waiver_version  text not null,
  signed_name             text not null,
  ip_address              text,
  user_agent              text,
  signed_at               timestamptz not null default now()
);

alter table public.consents enable row level security;

-- users can select and insert only their own consent rows
create policy "consents_select_own"
  on public.consents for select
  using (auth.uid() = user_id);

create policy "consents_insert_own"
  on public.consents for insert
  with check (auth.uid() = user_id);

-- service_role bypass (admin audit reads)
create policy "consents_service_role_all"
  on public.consents for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index consents_user_id_idx on public.consents(user_id);
create index consents_signed_at_idx on public.consents(signed_at desc);

-- ── Trigger: advance onboarding_status on consent insert ──
create or replace function public.handle_consent_signed()
returns trigger language plpgsql security definer as $$
begin
  update public.athletes
  set
    terms_accepted_at          = new.signed_at,
    medical_waiver_accepted_at = new.signed_at,
    onboarding_status          = 'consent_signed',
    updated_at                 = now()
  where user_id = new.user_id;
  return new;
end;
$$;

create trigger on_consent_inserted
  after insert on public.consents
  for each row execute function public.handle_consent_signed();
