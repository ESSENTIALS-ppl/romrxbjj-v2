-- APPLIED Oct 19 2026 2:48 PM ET (Jim approved 2:47 PM ET). Oct 19 2026. Supabase advisor 0029: SECURITY DEFINER functions executable by authenticated.
-- 12 of the 13 are called by the BJJ, Bodybuilding and Yoga apps via supabase.rpc as a signed-in user, and each one
-- scopes itself to auth.uid(); they stay. Only is_yoga_tester has no caller (apps, edge functions, RLS policies,
-- other functions, views, cron), so signed-in users lose direct access. service_role keeps it.
revoke execute on function public.is_yoga_tester() from public, anon, authenticated;
