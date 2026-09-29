-- 2026-09-29 security triage (advisor: SECURITY DEFINER executable by authenticated).
-- No client callers in any ESSENTIALS-ppl repo:
--   compute_joint_scores(uuid): only compute-tiers (service role) calls it; no ownership check.
--   assessments_autofill_athlete_id(), ensure_notif_prefs_for_user(): trigger functions.
revoke execute on function public.compute_joint_scores(uuid) from public, anon, authenticated;
grant execute on function public.compute_joint_scores(uuid) to service_role;
revoke execute on function public.assessments_autofill_athlete_id() from public, anon, authenticated;
revoke execute on function public.ensure_notif_prefs_for_user() from public, anon, authenticated;
