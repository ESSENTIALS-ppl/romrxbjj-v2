-- J6 / Stacy 1518 Part G: linked amendment rows for billing_consents. MIGRATION FILE ONLY. NOT APPLIED.
-- Sable decides if a fresh Jim yes is needed (Stacy 1518 J6) before this is applied or any row is written.
-- G1: the original billing_consents row is NEVER updated or deleted; a change is a new row here that points to it.
-- G3: no backdating; stripe_changed_at is the real Stripe update time; a filled value is never changed afterwards.
-- Apply (when pinned): Supabase MCP apply_migration name billing_consent_amendments, this file's bytes.

create table public.billing_consent_amendments (
  id                      uuid primary key default gen_random_uuid(),
  parent_consent_id       uuid not null references public.billing_consents(id) on delete restrict,
  amendment_kind          text not null check (amendment_kind in ('trial_end_move', 'trial_end_move_rollback')),
  user_id                 uuid not null,
  stripe_subscription_id  text not null,
  old_trial_end           timestamptz not null,
  new_trial_end           timestamptz not null,
  reason                  text not null,
  stripe_changed_at       timestamptz not null,
  stripe_idempotency_key  text not null unique,
  stripe_request_id       text,
  notice_version          text,          -- Notice A version; NULL until sent
  notice_sha256           text,          -- sha256 of the Notice A text actually sent; NULL until sent
  notice_sent_at          timestamptz,   -- NULL until sent
  terms_version           text not null,
  terms_effective_date    date not null,
  livemode                boolean not null default true,
  recorded_at             timestamptz not null default now(),
  check (old_trial_end <> new_trial_end),
  check ((notice_sent_at is null) = (notice_version is null))
);

create index billing_consent_amendments_parent_idx on public.billing_consent_amendments (parent_consent_id);
create index billing_consent_amendments_sub_idx on public.billing_consent_amendments (stripe_subscription_id);

alter table public.billing_consent_amendments enable row level security;
create policy billing_consent_amendments_owner_read on public.billing_consent_amendments
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: only the service role writes.

-- Append-only guard (G1/G3). No delete. An update may only fill notice_version / notice_sha256 / notice_sent_at
-- from NULL, once. Every other column is frozen.
create or replace function public.billing_consent_amendments_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'billing_consent_amendments is append-only (no delete)';
  end if;
  if (new.id, new.parent_consent_id, new.amendment_kind, new.user_id, new.stripe_subscription_id, new.old_trial_end,
      new.new_trial_end, new.reason, new.stripe_changed_at, new.stripe_idempotency_key, new.stripe_request_id,
      new.terms_version, new.terms_effective_date, new.livemode, new.recorded_at)
     is distinct from
     (old.id, old.parent_consent_id, old.amendment_kind, old.user_id, old.stripe_subscription_id, old.old_trial_end,
      old.new_trial_end, old.reason, old.stripe_changed_at, old.stripe_idempotency_key, old.stripe_request_id,
      old.terms_version, old.terms_effective_date, old.livemode, old.recorded_at) then
    raise exception 'billing_consent_amendments: only the Notice A fields may be filled';
  end if;
  if (old.notice_version is not null and new.notice_version is distinct from old.notice_version)
     or (old.notice_sha256 is not null and new.notice_sha256 is distinct from old.notice_sha256)
     or (old.notice_sent_at is not null and new.notice_sent_at is distinct from old.notice_sent_at) then
    raise exception 'billing_consent_amendments: a filled Notice A value is never changed';
  end if;
  return new;
end $$;

create trigger billing_consent_amendments_guard
  before update or delete on public.billing_consent_amendments
  for each row execute function public.billing_consent_amendments_guard();
