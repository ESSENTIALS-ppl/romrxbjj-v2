-- STAGED, NOT APPLIED. Grant ruling 4:12 PM ET Nov 24 2026: apply via MCP apply_migration right before the
-- combined-io-fg-v2 publish. Name: terms_version_20261231_v1. Rename this file to its applied id afterwards.
-- New consents record terms-2026-12-31-v1. No existing consents rows change. No re-consent is forced here.
-- Transition: signup trigger and re-accept RPC accept the old 2026-10-19 OR the new value, so clients still on
-- 2026-10-19 (cached tabs, publish lag) keep working. Other versions are still rejected.
-- Rollback: terms_version_20261231_v1.rollback.sql (restores the exact live 2026-10-19 bodies).
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = pg_catalog, pg_temp as $$ select 'terms-2026-12-31-v1'::text $$;

create or replace function public.accepted_terms_version(p text)
returns boolean language sql immutable set search_path = pg_catalog, pg_temp as $$
  select p in ('2026-10-19', 'terms-2026-12-31-v1')
$$;
revoke all on function public.accepted_terms_version(text) from public, anon;
grant execute on function public.accepted_terms_version(text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_signup_terms_consent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_terms text := m->>'terms_version';
  v_text text := m->>'consent_text_version';
  v_source text := m->>'consent_source';
begin
  if coalesce(m->>'terms_accepted', '') <> 'true' then
    return new;  -- path did not show our checkbox: record nothing
  end if;
  if not coalesce(public.accepted_terms_version(v_terms), false) then
    raise exception 'terms record: version % is not current', coalesce(v_terms, 'null') using errcode = '22023';
  end if;
  if not public.allowed_consent_text_version(v_text) then
    raise exception 'terms record: unknown consent_text_version' using errcode = '22023';
  end if;
  if not coalesce(public.allowed_signup_consent(v_source, v_text), false) then
    raise exception 'terms record: unknown source for this checkbox' using errcode = '22023';
  end if;

  insert into public.consents (
    user_id, terms_version, medical_waiver_version, signed_name,
    ip_address, user_agent, signed_at, consent_text_version, source
  ) values (
    new.id, v_terms, v_terms,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1), 'unknown'),
    null, left(nullif(m->>'consent_user_agent', ''), 512), now(), v_text, v_source
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_terms_reaccept(p_terms_version text, p_consent_text_version text, p_source text, p_user_agent text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not coalesce(public.accepted_terms_version(p_terms_version), false) then
    raise exception 'terms record: version is not current' using errcode = '22023';
  end if;
  if p_consent_text_version is distinct from 'signup-checkbox-2026-10-05' then
    raise exception 'terms record: unknown consent_text_version' using errcode = '22023';
  end if;
  if not coalesce(public.allowed_reaccept_source(p_source), false) then
    raise exception 'terms record: unknown source' using errcode = '22023';
  end if;
  -- Idempotent: one current-version row is enough.
  if exists (select 1 from public.consents where user_id = v_uid and terms_version = p_terms_version) then
    select max(signed_at) into v_at from public.consents where user_id = v_uid and terms_version = p_terms_version;
    return v_at;
  end if;
  select coalesce(nullif(trim(u.full_name), ''), split_part(u.email, '@', 1), 'unknown')
    into v_name from public.users u where u.id = v_uid;
  insert into public.consents (
    user_id, terms_version, medical_waiver_version, signed_name,
    ip_address, user_agent, signed_at, consent_text_version, source
  ) values (
    v_uid, p_terms_version, p_terms_version, coalesce(v_name, 'unknown'),
    null, left(nullif(p_user_agent, ''), 512), v_at, p_consent_text_version, p_source
  );
  return v_at;
end;
$function$;
