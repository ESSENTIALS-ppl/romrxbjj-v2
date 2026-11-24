-- ============================================================================================
-- STAGED. NOT APPLIED. Apply later with the Supabase MCP apply_migration (name: romood_insert_accepts_v2_or_v3_consent),
-- SQL verbatim from this file, only after the gate (pin, Vera precheck, Sable release). Rollback:
-- 20261124210000_romood_insert_accepts_v2_or_v3_consent.rollback.sql.txt
--
-- Why (ROMBot mood reading, Jim GO Nov 24 2026 3:36 PM ET): ROMBot reads check-ins only for the v3 opt-in
-- (mood_settings.consent_version = 'v3-rombot-20261028', Stacy Oct 28 2026). The live restrictive insert policy
-- (applied Oct 27 as 20261027151753 romood_insert_requires_v2_consent) accepts ONLY 'v2-email-20261026', so once the app
-- writes v3, every v3 user's check-in save would be rejected.
--
-- Change vs the Oct 28 draft (20261028100000, v3 ONLY): this accepts v2 OR v3, so there is NO save gap in either order
-- (apply before Jules's v3 app publish; the live v2 app keeps saving; v2 users keep saving until they re-tick).
-- ROMBot still reads ONLY v3 (enforced in ai-chat romood_chat.js moodConsentCurrent). The results-email gate is unchanged.
--  * No new table, column, function or grant. mood_settings.consent_version is free text. Existing rows untouched.
-- ============================================================================================

drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;
drop policy if exists mood_entries_insert_requires_v2_or_v3_consent on public.mood_entries;
create policy mood_entries_insert_requires_v2_or_v3_consent on public.mood_entries
  as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mood_settings s
       where s.user_id = mood_entries.user_id
         and s.consent_version in ('v2-email-20261026', 'v3-rombot-20261028')
         and s.opted_in_at is not null
    )
  );
