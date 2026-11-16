# fix/renewal-reminder-base-brand-20261115 (standalone, NOT from main)
Baseline commit = exact live send-renewal-reminders v26 source (ezbr dece2cb7…6dda), pulled read-only 2026-11-15.
Deploy layout on Supabase: source/index.ts = send-renewal-reminders/index.ts, source/logic.ts = send-renewal-reminders/logic.ts, _shared/email_footer.ts = _shared/email_footer.ts.
BRANCH ONLY. Not deployed. RENEWAL_BASE_SEND and the 7 AM ET cron are untouched.
