# RECEIPT ebfe4f3d Base test setup for Reid, Tue Nov 24 2026 (ET)
Authority: Jim 3:55 PM ET (FG list), Grant 3:56 PM ET item 6; Jim 4:09 PM ET Base only (no coach link). No Stripe, no checkout, no sends, no new accounts. 7c71e421 and 076ce453 not touched.
Account: ebfe4f3d-0619-4460-a5f7-08217ea31909 (test-flagged: is_test_account true, app_metadata test_fixture true; alias tag romrx-audit-20261004-r15).

BEFORE (4:11:37 PM ET): base_status inactive, base_expiry null, no Stripe customer, no Base subscription, active_sport general, 0 sport entitlements; 1 assessment 9ca55ad2 (Oct 4, rom 81, 10 joint_scores); product_events 31; email_sends 1; notification_preferences opt-in markers all null.
Send-path check (all clear): lifecycle-emails v11 needs an opt-in marker (all null); send-conversion-drip v26 only selects active_sport bjj/bodybuilding (this is general); rombot-checkin v6, send-push-notification v28 and send-renewal-reminders v33 skip is_test_account; on_new_user_send_s1_welcome fires on auth.users INSERT only; assessments trigger posts to compute-tiers v59 (scores only, no email). No Stripe rows, so no Notice A/B or trial-ending path applies.

WRITE (one MCP execute_sql statement, EXECUTED-ebfe4f3d.sql sha256 e95e8b96, ~4:12 PM ET): users.base_status inactive -> active (base_expiry left null, same as no-Stripe test accounts af305114 and 9d64f196); 2 full Base assessments inserted:
  b0d68db1-5ef2-46fa-973b-6a10e12ce727  assessed_at Nov 10 2026 12:00 PM ET
  a9b06108-c130-4ede-8c95-567546d6408d  assessed_at Nov 17 2026 12:00 PM ET
AFTER (4:12:47 PM ET): base_status active, base_expiry null, still no Stripe customer or subscription, active_sport general. Assessments 3: 9ca55ad2 rom 81, b0d68db1 rom 89, a9b06108 rom 94; each has 10 joint_scores (compute-tiers ran). email_sends still 1 (no send). New product_events 4: base_status_changed, base_activated, assessment_submitted x2 (analytics only). net._http_response non-200 in last 5 min: 0. user_mobility_schedule unchanged (last_assessment 9ca55ad2).
Rollback (not run): ROLLBACK-ebfe4f3d.sql deletes only the 2 new ids (children cascade) and restores base_status inactive.
Reid note: do not tick reminder or digest opt-ins in Settings and do not click any Subscription or Billing control (that would start an email or a Stripe path).
