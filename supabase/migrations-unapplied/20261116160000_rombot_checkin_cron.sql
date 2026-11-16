-- P1-17 day 3 ROMBot check-in: hourly cron for the new rombot-checkin function. UNAPPLIED. BUILD ONLY.
-- Apply ONLY via MCP apply_migration, and only after rombot-checkin is deployed, its own sha gate line, Vera precheck PASS,
-- and Sable's OK. Rename this file to its live id after apply (pure-rename commit).
-- Rollback: 20261116160000_rombot_checkin_cron_rollback.sql
-- Version 20261116160000 is a placeholder after the live head (20261116143959 at build time); apply_migration stamps the real id.
-- Same pattern as the live lifecycle-emails-hourly job (public.cron_call_edge, which sends the cron secret header).
-- Scheduling the job sends nothing by itself: the function is a dry run until ROMBOT_CHECKIN_SEND is exactly "on",
-- and the email fallback also needs LIFECYCLE_EMAILS_SEND exactly "on". This migration sets neither.
-- No table, column, policy or data change.

select cron.schedule('rombot-checkin-hourly', '30 * * * *', $$select public.cron_call_edge('rombot-checkin', 120000)$$);
