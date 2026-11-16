-- P1-06 follow-up (c). UNAPPLIED. Needs 20261116031000 (assessments.check_kind) first. Replaces the live trigger function
-- public.tg_pe_assessment_inserted (trigger zz_pe_assessment_inserted, unchanged) so a quick re-check is NOT logged as
-- 'assessment_submitted' (which would inflate P1-22 assessment counts). A quick row logs the distinct event
-- 'quick_recheck_submitted' (already in the P1-22 ops.user_actions allowlist). prior_count / is_reassessment count full rows only
-- (check_kind IS DISTINCT FROM 'quick', so NULL counts as full). Full rows log exactly as before.
-- Rollback: 20261116031100_pe_assessment_inserted_quick_rollback.sql (the live definition read Nov 15, 2026, read only).
CREATE OR REPLACE FUNCTION public.tg_pe_assessment_inserted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_measured int; v_prior int;
begin
  select count(*) into v_measured from jsonb_each_text(to_jsonb(new)) e
   where e.value is not null and (e.key like 'hip_%' or e.key like 'shoulder_%' or e.key like 'ankle_%' or e.key like 'cervical_%' or e.key like 'lumbar_%' or e.key like 'thoracic_%' or e.key like 'balance_%');
  if new.check_kind is not distinct from 'quick' then
    perform public.log_product_event(new.user_id, 'quick_recheck_submitted',
      jsonb_build_object('assessment_id', new.id, 'measured_fields', v_measured),
      new.sport);
    return new;
  end if;
  select count(*) into v_prior from public.assessments a
   where a.user_id = new.user_id and a.id <> new.id and a.check_kind is distinct from 'quick';
  perform public.log_product_event(new.user_id, 'assessment_submitted',
    jsonb_build_object('assessment_id', new.id, 'measured_fields', v_measured, 'is_reassessment', v_prior > 0, 'prior_count', v_prior),
    new.sport);
  return new;
end; $function$;
