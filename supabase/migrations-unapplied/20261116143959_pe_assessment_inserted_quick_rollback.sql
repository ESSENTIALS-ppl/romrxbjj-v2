-- Rollback for UNAPPLIED 20261116031100: restores the live tg_pe_assessment_inserted exactly as read Nov 15, 2026 (read only).
-- Run BEFORE the check_kind rollback (20261116031000_rollback) if both are rolled back.
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
  select count(*) into v_prior from public.assessments a where a.user_id = new.user_id and a.id <> new.id;
  perform public.log_product_event(new.user_id, 'assessment_submitted',
    jsonb_build_object('assessment_id', new.id, 'measured_fields', v_measured, 'is_reassessment', v_prior > 0, 'prior_count', v_prior),
    new.sport);
  return new;
end; $function$;
