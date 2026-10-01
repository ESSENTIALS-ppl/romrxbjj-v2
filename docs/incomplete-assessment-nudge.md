# Incomplete-assessment nudge (Base) - design, DRAFT

Status: DRAFT PR. Not merged, not deployed, no cron job, nothing sent. Needs Jim's send approval.

## What it does
Emails Base users who signed up and have not finished the assessment. Push is deferred (see below).

| Stage | email_id | When | Cap |
|---|---|---|---|
| A | incomplete_a | 2 to 20 hours after signup | |
| B | incomplete_b | 24 to 72 hours after A was sent | max 2 emails per person, total |
| Catch-up | incomplete_catchup | users created before NUDGE_AB_SINCE, once | ONE email, never A or B |

Stops on: assessment row exists (checked twice, the second time right before send), marketing_opt_out, email_reminders off, EU/UK or unknown timezone, quiet hours 9pm to 8am local, test account or audit fixture (live mode), non-Base sport.

## Files
- supabase/functions/_shared/nudge_rules.ts: pure rules, unit tested (11 tests)
- supabase/functions/_shared/nudge_copy.ts: copy with Stacy's fixes, footer, unsubscribe link (7 tests: no em or en dashes, no banned words, footer, link, UTM)
- supabase/functions/send-incomplete-assessment-nudge/index.ts: cron-secret gated, DRY RUN by default
- supabase/functions/unsubscribe/index.ts: added to repo from deployed v4, plus RFC 8058 one-click POST support (form body)

## Safety switches (all OFF by default, set as function secrets by Jim/Avery, never in code)
- NUDGE_ENABLED=true to run at all
- NUDGE_DRY_RUN=false to actually send (default true: returns the plan only)
- NUDGE_AB_SINCE=<ISO time>: users created at or after this get A/B (set to launch time, e.g. 2026-10-05T12:00:00Z)
- NUDGE_CATCHUP_ENABLED=true to send the one catch-up email to the older backlog
- NUDGE_TEST_ONLY=true plus NUDGE_TEST_ALLOWLIST=a@x,b@y to send only to listed test addresses

## Cron (not created by this PR)
After approval: select cron.schedule('incomplete-nudge-hourly', '5 * * * *', $$select public.cron_call_edge('send-incomplete-assessment-nudge', 10000)$$);

## Findings that matter (read-only investigation, Oct 1)
1. S1-2 (24h), S1-3 (72h) and S1-4 (120h) already email BJJ users with no assessment, hourly. They filter active_sport = bjj, so Base (general) users get nothing from them today. Do not widen them.
2. Every existing drip footer links to romrxbjj.com/unsubscribe (and romrx.io/unsubscribe), which return 404. The working page is romrx.io/app/unsubscribe. This draft uses the working one. The old links should be fixed or redirected (Jim/Avery decision, see below).
3. profiles is a VIEW over users, so the existing marketing_opt_out checks do work.
4. The unsubscribe edge function (v4) is live and works, but its source was not in the repo. Added here.
5. send-s1-welcome-email already sends one welcome email at signup (email_sends s1_1_welcome).
6. No web push infrastructure: 0 push subscriptions, 0 users with push_reminders, send-push-notification is a 410 stub, save-push-subscription exists but nothing in the app calls it. No native tokens. Push is not possible today.

## Test plan (test accounts only)
1. deno test supabase/functions/_shared/ (18 tests).
2. Deploy to a branch or after approval with NUDGE_ENABLED=true, NUDGE_DRY_RUN=true: call with the cron secret, confirm plan counts match the expected eligible set and no real user is in a would_send list unless intended.
3. Create 2 fixtures jim+romrx-nudge-1@romrx.io and -2 (is_test_account). Set NUDGE_TEST_ONLY=true and NUDGE_TEST_ALLOWLIST to those. Backdate users.created_at 3h: expect A to Jim's inbox only. Backdate email_sends A by 25h: expect B. Run again: expect nothing (cap).
4. Complete an assessment on fixture 2 before the run: expect assessment_complete, no send.
5. Click Stop these reminders: expect marketing_opt_out true, next run sends nothing. Also POST the List-Unsubscribe-Post form body: expect same.
6. Set quiet hours by changing fixture timezone so local time is 10pm: expect quiet_hours.
7. Delete fixtures by explicit id afterwards.

## Needs Jim
See the plan file: approve send, catch-up timing, From address, push decision, old unsubscribe links.
