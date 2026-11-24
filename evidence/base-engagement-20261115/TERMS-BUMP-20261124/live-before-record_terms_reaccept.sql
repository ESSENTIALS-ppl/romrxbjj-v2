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
  if p_terms_version is distinct from public.current_terms_version() then
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
