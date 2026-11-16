-- Clear a user's draft the moment a real assessment row lands. PROPOSED, NOT APPLIED. Needs the table migration first.
-- Covers every client and the submit-assessment edge function (v40, not redeployed) without a code change.
-- The body deletes one row by primary key. Rollback: 20261029100100_assessment_drafts_clear_on_submit.rollback.sql.txt
create or replace function public.assessment_drafts_clear_on_submit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- The draft delete must never block a real assessment insert (Vera D2): if the table is missing
  -- (rolled back out of order) or the delete fails for any reason, warn and let the insert go through.
  begin
    delete from public.assessment_drafts where user_id = new.user_id;
  exception when others then
    raise warning 'assessment_drafts_clear_on_submit: draft delete skipped (%): %', sqlstate, sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.assessment_drafts_clear_on_submit() from public, anon, authenticated;

create trigger assessments_clear_draft_ai
  after insert on public.assessments
  for each row execute function public.assessment_drafts_clear_on_submit();
