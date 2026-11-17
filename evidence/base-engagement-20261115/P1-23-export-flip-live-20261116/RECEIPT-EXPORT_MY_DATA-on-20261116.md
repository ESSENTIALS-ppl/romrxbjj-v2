# Receipt: EXPORT_MY_DATA = on
Project cqzvqzwwevnflinxgnpp (romrxbjj-v2, production)
Set: 2026-11-16 21:08:48-21:08:51 EST via `supabase secrets set EXPORT_MY_DATA=on --project-ref cqzvqzwwevnflinxgnpp --yes` (CLI v3.0.0), exit 0, "Finished supabase secrets set." count 1
Token: romrx-cli-20261116 (by name only)
Value digest (CLI list after): b8d31e85 (exact "on", no newline; local printf 'on' | sha256sum = b8d31e85)
Authority: Jim first-hand, card t2043s6428, 2026-11-16 21:02 EST; L1319, L1323; Vera r6b delta precheck f863c1f1; Sable standing OK; Grant 9:08 PM ET identity re-pin (ezbr + updated_at + verify_jwt; version ignored)

## export-my-data identity (CLI functions list, before 21:08:42 / after 21:08:51 EST; MCP list_edge_functions re-read before)
- Before: version 4, ACTIVE, verify_jwt true, ezbr 45dd9300cc48c01ae31d9e76685fbff27de8b96125e57312d97efe08d38030f7, updated_at 2026-11-16 20:07:09.629 EST. PASS on the re-pin.
- After: version 5, ACTIVE, verify_jwt true, ezbr 45dd9300cc48c01ae31d9e76685fbff27de8b96125e57312d97efe08d38030f7, updated_at 2026-11-16 20:07:09.629 EST.
- Not redeployed. v2 never redeployed.

## All 40 functions across the set
40 before, 40 after, same slugs. ezbr, updated_at, verify_jwt and status unchanged for all 40. Only version moved: +1 on all 40 (secrets set bumps every version).
| slug | version | ezbr8 | updated_at (ms) | ezbr/updated_at |
|---|---|---|---|---|
| activate-beta-base | 14 -> 15 | c1bbafc2 | 1790107246123 | same |
| ai-chat | 97 -> 98 | 2db1a2de | 1794791677539 | same |
| ai-chat-claims-test | 12 -> 13 | 0b9a93a9 | 1791848518380 | same |
| coach-actions | 28 -> 29 | 831bb410 | 1780590972480 | same |
| compute-tiers | 55 -> 56 | f4c62a38 | 1794840179988 | same |
| compute-tiers-base | 12 -> 13 | b14f678b | 1793748448928 | same |
| create-checkout-session | 46 -> 47 | 2b7dd0ce | 1791306753921 | same |
| create-portal-session | 24 -> 25 | 67ab693a | 1793213409586 | same |
| embed-general-once | 11 -> 12 | 8be466ff | 1790031710163 | same |
| embed-knowledge | 24 -> 25 | fa413811 | 1793748443107 | same |
| export-my-data | 4 -> 5 | 45dd9300 | 1794877629629 | same |
| feedback-to-notion | 25 -> 26 | 6bc351ca | 1790652861342 | same |
| get-coach-roster | 22 -> 23 | 8945b54b | 1780258247331 | same |
| join-waitlist | 4 -> 5 | 1fc0dccc | 1793302097366 | same |
| lifecycle-emails | 5 -> 6 | 6714009f | 1794875376743 | same |
| notify-coach-signup | 24 -> 25 | daffdfba | 1790886213516 | same |
| notify-inbound-lead | 11 -> 12 | 688f7a4c | 1790654751690 | same |
| request-account-deletion | 12 -> 13 | d662e9b8 | 1794795721977 | same |
| rombot-checkin | 2 -> 3 | fbad0021 | 1794875714903 | same |
| rombot-conversations | 3 -> 4 | 986e2f58 | 1793673315762 | same |
| save-push-subscription | 21 -> 22 | 5d123c2b | 1793674569121 | same |
| send-bb-s1-2-followup-email | 21 -> 22 | e9e5475d | 1791116031611 | same |
| send-bb-s1-3-followup-email | 21 -> 22 | d84da24a | 1791116062759 | same |
| send-bb-s1-4-stilhere-email | 21 -> 22 | 67191eb3 | 1791116095345 | same |
| send-conversion-drip | 22 -> 23 | bb615a0e | 1791115846524 | same |
| send-protocol-reminder | 22 -> 23 | 0e35974d | 1790886207282 | same |
| send-push-notification | 22 -> 23 | 408b8f4b | 1793674571102 | same |
| send-renewal-reminders | 28 -> 29 | 3bcc783c | 1794840693475 | same |
| send-s1-2-followup-email | 24 -> 25 | 70ec7706 | 1791115922617 | same |
| send-s1-3-masters-email | 24 -> 25 | 8cc03fd5 | 1791115959091 | same |
| send-s1-4-stilhere-email | 24 -> 25 | 00490da6 | 1791115990751 | same |
| send-s1-welcome-email | 36 -> 37 | 99f5d36b | 1791306107030 | same |
| send-whats-new | 8 -> 9 | fc831df4 | 1792361907890 | same |
| serve-base-icon | 14 -> 15 | 6d3d9acc | 1788904501829 | same |
| stripe-webhook | 55 -> 56 | 3c60342d | 1794798202544 | same |
| submit-assessment | 46 -> 47 | edb16eb4 | 1794840159779 | same |
| submit-consent | 25 -> 26 | e760e676 | 1777906243266 | same |
| submit-feedback | 22 -> 23 | d6c1e021 | 1783297865088 | same |
| submit-lead-assessment | 32 -> 33 | 48c6f464 | 1793051542506 | same |
| unsubscribe | 15 -> 16 | 879abbfa | 1794875280360 | same |

## Secrets (names only)
Diff: added EXPORT_MY_DATA; removed none; changed none (by value digest).
Before (25 names): ARL_LIVE_ENABLED, NOTION_API_KEY, NOTION_FEEDBACK_DB_ID, PUBLIC_ORIGIN, RENEWAL_BASE_SEND, RESEND_API_KEY, ROMOOD_EMAIL_MOOD, ROMRxBJJ, STRIPE_SECRET_KEY, STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET, SUPABASE_ANON_KEY, SUPABASE_DB_URL, SUPABASE_JWKS, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, UNSUBSCRIBE_HMAC_SECRET, WAITLIST_UNSUB_SECRET, WEBHOOK_SECRET, romrx_cron_secret , romrx_openai_key, stripe_webhook_secret
After (26 names): ARL_LIVE_ENABLED, EXPORT_MY_DATA, NOTION_API_KEY, NOTION_FEEDBACK_DB_ID, PUBLIC_ORIGIN, RENEWAL_BASE_SEND, RESEND_API_KEY, ROMOOD_EMAIL_MOOD, ROMRxBJJ, STRIPE_SECRET_KEY, STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET, SUPABASE_ANON_KEY, SUPABASE_DB_URL, SUPABASE_JWKS, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, UNSUBSCRIBE_HMAC_SECRET, WAITLIST_UNSUB_SECRET, WEBHOOK_SECRET, romrx_cron_secret , romrx_openai_key, stripe_webhook_secret

Not touched: cron (14 jobs; job 1 never), migrations, other secrets, other functions.
Rollback: `supabase secrets unset EXPORT_MY_DATA --project-ref cqzvqzwwevnflinxgnpp` (function returns 503 unless exactly "on"); expect all 40 versions +1 again.
