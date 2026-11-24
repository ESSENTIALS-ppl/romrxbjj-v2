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
  if v_terms is distinct from public.current_terms_version() then
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
