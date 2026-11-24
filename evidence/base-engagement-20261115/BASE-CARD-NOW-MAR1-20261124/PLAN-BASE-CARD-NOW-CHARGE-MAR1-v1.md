# PLAN: ROMRx Base takes a card now and charges nothing before March 1, 2027 (v1)
Written 2026-11-24 about 3:15 PM ET (EST) by Avery. PLAN ONLY. No deploy set, no Stripe writes, no Supabase writes, no live changes, nothing sent.
Read-only queries only (Supabase MCP execute_sql SELECT, get_edge_function). No secret values printed. No customer addresses here: ids are cut to 8 characters.
Immediate-charge branch feat/base-immediate-charge-20261124 (15a693fd / 0d2645b9) is DROPPED: not pinned, not deployed. It is reference only (test harness, mutant runner, dry-run printer, 409 guard, activate cap).

## The rule (settled, Sable L1487/L1489, relayed by Grant 3:07 PM ET)
- Nobody is charged before 1803920400.
- Every Base sign-up before 1803920400 gets subscription trial_end = 1803920400. This is the single constant.
- From 1803920400 on, Base checkout charges $60 at sign-up (no trial) and stays open. There is no closure.
- 1803920400 = Monday, March 1, 2027, 12:00:00 PM EST (UTC-5). Checked: datetime(2027,3,1,12, America/New_York).timestamp() = 1803920400. Noon matches the current 1798822800 (Jan 1, 2027, 12:00 PM EST) convention.
- The constant is built in the separate fast-track constant job. This plan references it and does not duplicate it.

Sources: live create-checkout-session v52 (ezbr 36abc3ba) = PACKS-CLOSED-MESSAGE-20261124/deploy-set-L1468 (index.ts 3b706ba8 and packs_gate.ts 21bc6a5f from 643e27f0, plus _shared from live v50: arl_copy c06bd315, events 49f18652, rate_limit f3a82f1d; the post-deploy hash check matched all five).
Other live functions: stripe-webhook v59 (3c60342d), activate-beta-base v18 (c1bbafc2), send-renewal-reminders v32 (3bcc783c, = main 4ea5edd7), create-portal-session v28 (67ab693a).
Copy: Stacy 1457 (95525829), unavailable-text 1457 (b243ac72), FINAL STRINGSET 1459 (55c49a8c, SUMS -c OK), Notices A/B 1501 (384ceafc, SUMS -c OK), and Jules inventory (78c4d0d6, read first-hand).

## 0. Where the card is collected today (Grant 3:02 PM; Kai and Stacy)
- Account sign-up and the first assessment take no card. Nothing on the sign-up or assessment path calls Stripe.
- The card is taken only at Stripe-hosted Checkout, when the user taps unlock Base:
  - romrx.io r9: ResultsPreview.tsx:216 fetches create-checkout-session (CHECKOUT_URL :36). Unlock.tsx:41/:55/:124 and MySport.tsx:59 do the same.
  - romrxbjj.com and romrxbodybuilding.com (P1-33 v2, live since 2:55 and 2:56 PM ET today, per Jules): ResultsPreview, through src/lib/baseCheckout.ts.
- On romrx.io, handleUnlock first calls activate-beta-base (ResultsPreview.tsx:178, BETA_ACTIVATE_URL :37). That function grants Base with no card ONLY when both of these hold:
  - (a) the caller is an audit temp: the email matches the audit-temp pattern AUDIT_EMAIL_RE (jim+romrx-audit-20260922-NN at the romrx.io domain), or the uid is on the 10-uid Heavy allowlist (activate v18 index.ts:20-33, check at :98-104). Everyone else gets 402 not_audit_temp.
  - (b) the env FREE_UNLOCK_ENABLED is "true", or public.feature_flags 'free_unlock' is enabled (:113-130).
- Flag value now (read-only):
  - ops.feature_flags key 'free_unlock': enabled = false, last updated 2026-09-22 4:31 PM ET.
  - FREE_UNLOCK_ENABLED is a function secret. I have no read-only way to list secret names: no MCP secrets tool, and the CLI token returns 401 (APE-5). So whether it is set is UNCONFIRMED.
  - Either way, gate (a) runs first, so every real (non-audit) user gets 402 and goes on to card Checkout today.
- Server: v52 sets payment_method_collection: "always" explicitly on both Base paths: legacy index.ts:257 (block :237-262) and ARL :311 (block :299-316). The sport-unlock paths set it too (:395, :443).
  - For a $0-today trial this matters: Stripe Checkout's default for subscription mode is "always" anyway, but setting it explicitly means Checkout must collect a card even though $0 is due.
- So "take a card now" already holds AT UNLOCK. It does not hold at account sign-up.
  - Stacy's S6/S7 wording ("Your first assessment and its results are free ... A payment card is collected when you unlock Base") matches the code.
  - No flow change is needed unless Jim means a card at account creation. That is OPEN DECISION J1 (it would put a card before the free assessment and contradict S6/S7).
- Plan change for "every unlock goes through card checkout": see step D5. activate-beta-base is closed at the constant and the romrx.io call is removed.

## 1. Stripe method: keep the subscription with trial_end, moved to 1803920400
- Keep the live mode "subscription" Checkout. subscription_data.trial_end comes from planBaseCheckout (packs_gate.ts:38-41). It is 1803920400 while now < 1803920400 and is omitted afterwards (paid at sign-up).
- payment_method_collection stays "always". The trial is 96.9 days from today, well under Stripe's 730-day trial maximum.
- **48-hour limit (FLAG).** Checkout requires trial_end at least 48 h in the future. Sign-ups from 1803747600 (Sat Feb 27, 2027, 12:00 PM EST) to 1803920400 cannot get trial_end = 1803920400. This is the reason for today's Dec 30 503 (v52 index.ts:211 comment). Options for that 48 h window, OPEN DECISION J2:
  - (a) 503 with Stacy's cleared "Base sign-up is temporarily unavailable. Please check back soon." for 48 h. Smallest change, the existing pattern. Recommended.
  - (b) trial_period_days = 2 in the window. The charge lands on Mar 1 to 3 at the sign-up clock time, so no charge before Mar 1, but the renewal date drifts off Mar 1. Copy says "on March 1".
  - (c) Checkout mode "setup", then the server creates the subscription with trial_end 1803920400 (the Subscriptions API has no 48 h minimum). Most new code.
  - (d) Charge at sign-up from Feb 27 noon. Breaks "no charge before Mar 1". Rejected.
- **Rejected: billing_cycle_anchor = 1803920400 without a trial.** Stripe invoices now: a prorated first period, or a full charge with proration_behavior none. That is a charge before Mar 1.
- **Rejected: SetupIntent or setup-mode Checkout now, then a subscription created by cron on Mar 1.** Needs a new cron, off-session first charges (SCA and decline risk), and a consent record not tied to a subscription. The ARL ack and portal cancel would also need a subscription that does not exist yet. More parts, more ways to fail. (Only as option (c), for the last 48 h.)
- **Promo codes OFF for Base.** allow_promotion_codes is true at v52 index.ts:248 (legacy Base) and :302 (ARL Base). Set both to false. Leave :386 and :434 (sport) and :498 (other) as they are unless Jim says otherwise. This answers Stacy 1459 flag 10.
- **After 1803920400 (paid at sign-up):**
  - planBaseCheckout returns trialEndUnix null. The session has no trial_end. Stripe charges $60 at sign-up.
  - The disclosure, consent and ack must switch to a paid variant at the same constant (1459 flag 8).
  - Stacy has NOT cleared post-Mar-1 strings. The immediate-charge P1/P2/P5/P7 are VOID per 1457. OPEN: Stacy must write them before Feb 27, 2027.
  - arl_period metadata: "free" before, "paid" after (index.ts:289).

## 2. Remove the Dec 30 noon 503 and everything keyed to it
The full table with actions is in INVENTORY section 2. Summary:
- create-checkout-session v52 source/index.ts:211-215: the 503 block `Date.now() > (BETA_TRIAL_END_UNIX - 48*3600)*1000` (1798650000 = Dec 30, 2026 12:00 PM EST). REMOVE it. Replace with:
  - the J2 48 h guard keyed on 1803920400, and
  - the paid branch at now >= 1803920400.
- _shared/arl_copy.ts:14 (live) / :16 (main) `BETA_TRIAL_END_UNIX = 1798822800` changes to 1803920400. inFreePeriod (:15-17) follows it.
- packs_gate.ts:22 `PACKS_EARLIEST_OPEN_UNIX = 1798822800` must equal BETA_TRIAL_END_UNIX (test packs_gate_jan1).
  - :40 returns the constant before the instant and null after.
  - :25 packsCheckoutOpen earliest-open moves to Mar 1 too. OPEN J3: packs copy says "Coming Spring 2027", so Mar 1 is fine, but confirm.
- stripe-webhook v59 source/index.ts:226 writes the literal `trial_end: new Date(1798822800*1000)` into billing_consents.
  - Change it to the session's real subscription trial_end (Stripe retrieve), or null when paid at sign-up.
  - Without this, every new consent row says Jan 1.
- Versions: ARL_DISCLOSURE_VERSION and ARL_ACK_VERSION (live :10-11 / main :12-13) become ca-arl-3b-2027-03-01-v5 and ca-arl-3c-2027-03-01-v5.
- Client signals that key on the old date: romrx.io checkoutErrors.ts:3 (comment), ProtectedRoute.tsx:6 (comment), ResultsPreview.tsx:134 (comment), and button copy :343/:351/:365. These are Jules's; see INVENTORY section 3.
- Stacy's unavailable text stays for the J2 window and for the client's can't-reach state (button disabled).

## 3. Existing beta users: read-only counts and the gated move (L1487)
### 3a. Read-only counts (Supabase, today about 3:10 PM ET)
- billing_consents has 3 rows. All are offer base, disclosure ca-arl-3b-2026-09-29-v3, trial_end 2027-01-01 12:00 ET, base_status active, cancel_at_period_end false:
  - 21647e5a: livemode true, sub_1UVa..., base_expiry 2027-01-01 12:00 ET. Real customer.
  - 81f1cf44: livemode false (Stripe test mode), sub_1UMo..., base_expiry null.
  - 9d287227: livemode false (Stripe test mode), sub_1UNb..., base_expiry null.
- users base_status active: 17 in total, 4 with a Stripe sub id. The 4th is 7c71e421 (grandfathered, no trial consent): EXCLUDED, never touched. 13 have no Stripe sub and so nothing to move.
- 6a015e84 is canceled: not a mover. Fixture 076ce453 is excluded.
- **Stripe side: UNCONFIRMED.** There is no read-only Stripe key (LIVE-TRACKER.md:391 "Read-only Stripe key ... PENDING"). Actual status, trial_end, default payment method and schedules are not checked. The count of 3 is from the DB mirror only.

### 3b. Gated step L1487: move the 3 subs to trial_end 1803920400 (plan only, no writes)
- **When:** after D1 and D2 are live and post-checked, and before Wed Dec 2, 2026, 7:00 AM ET (see 3c). It must be before Jan 1, 2027, 12:00 PM ET in any case.
- **Sequence:** pin, then Vera precheck, then Sable release, then run, then post-check.
- **Sub list.** Full ids live in the pinned run file only, not in git:
  - 21647e5a (live): sub_1UVa..., before 1798822800, after 1803920400
  - 81f1cf44 (test mode): sub_1UMo..., before 1798822800, after 1803920400
  - 9d287227 (test mode): sub_1UNb..., before 1798822800, after 1803920400
- **Call per sub:** `stripe.subscriptions.update(id, { trial_end: 1803920400, proration_behavior: "none" }, { idempotencyKey: "L1487-trialend-1803920400-<sub_id>" })`.
  - Test-mode subs use the test key. The live sub uses the live key.
  - Whoever holds the key runs it. I never print or read it.
- **Dry run (default, read-only).** For each sub, retrieve and print: status, trial_end, current_period_end, cancel_at_period_end, cancel_at, schedule, default_payment_method present (yes/no), livemode, and the planned after value. No write without `--apply` plus the pin id.
- **Flags. Skip the sub and report it if any of these hold:**
  - status is not trialing
  - trial_end != 1798822800, or already 1803920400 (idempotent no-op)
  - canceled, cancel_at_period_end, or cancel_at set
  - a subscription schedule is attached
  - no default payment method
  - past_due
  - livemode does not match the DB row
  - sub id or customer does not match billing_consents
  - id in the excluded list
- **Excluded list:** 7c71e421, 076ce453, 6a015e84, plus every user without a billing_consents row.
- **Rollback per sub:** `subscriptions.update(id, { trial_end: 1798822800, proration_behavior: "none" })`. This works only while now < 1798650000 (48 h before Jan 1 noon). After that the old date cannot be restored, so the move is effectively one-way after Dec 30 noon ET.
- **Post-check (read-only):**
  - Stripe retrieve shows trial_end 1803920400 and status trialing.
  - The webhook customer.subscription.updated (v59 index.ts:662-685) sets users.base_expiry from current_period_end, which is the new trial_end, so the DB shows 2027-03-01 12:00 ET.
  - No invoice was created.
  - The renewal planner dry run shows no Dec 2 / Dec 30 send for these subs.
- **Mirror gap.** billing_consents.trial_end stays 2027-01-01. It is the consent record of what was disclosed, so do not rewrite it.
  - Fix the reader instead (D3).
  - Add a note column only if Jim wants one (OPEN J6; it would be a Supabase write).
- **Notice A:** Stacy 1501 draft, recommended after the move and before Jan 1. Draft only. No send path is built. Sable is taking it to Jim.

### 3c. Renewal reminders (read-only findings, time-sensitive)
- send-renewal-reminders v32 (= main). REMINDER_WINDOWS are 45/30/2 days (logic.ts:9-13). chargeAt (logic.ts:75-84) uses the latest future billing_consents.trial_end, else users.base_expiry.
  - Eligibility needs base_status active (logic.ts:99), and the webhook maps trialing to active, so it DOES fire for trial subs.
  - No hardcoded Jan 1, $149 or "Athlete" in the code. Price comes from consent amounts, the date from data.
  - Wording says "membership renews on", which is wrong for a first charge after a trial (INVENTORY rows 14-19, Stacy re-rule).
- Cron job 1 caab15b0 runs daily at 12:00 UTC = 7:00 AM ET (read-only; last 3 runs succeeded, Nov 22-24, 7:00 AM ET). Not touched.
- **Sends are ON.** renewal_reminders has 1 row: 45_day, expiry 2027-01-01, user 21647e5a, at 2026-11-17 7:00 AM ET. Claims are written only when RENEWAL_BASE_SEND == "on" (index.ts:72-76), so a 45-day email naming Jan 1, 2027 went to the live customer on Nov 17.
- **With no change:**
  - the 30-day email goes Wed Dec 2, 2026, 7:00 AM ET, naming Jan 1
  - the 2-day email goes Wed Dec 30, 2026, 7:00 AM ET
  - Both become false under the new rule.
- **Even after L1487, consent trial_end (Jan 1) is still in the future, so chargeAt keeps picking Jan 1.** Fix (D3): prefer users.base_expiry when present (webhook-synced from Stripe), and use consent trial_end only when base_expiry is null.
- **Deadline:** D3 live and L1487 done before Dec 2, 2026, 7:00 AM ET. If that is missed, OPEN J4: Jim can hold sends (RENEWAL_BASE_SEND off is an env write, his call).
- **After the fix, for a Mar 1, 2027 charge:** 45-day Fri Jan 15, 2027; 30-day Sat Jan 30, 2027; 2-day Sat Feb 27, 2027 (all 7:00 AM ET). Dedupe key (user, type, expiry date) is new, so they send once each.
- **Notice B** (required, 17602(b)(1)(A), 3-21 days before, Feb 8-26, 2027) is NOT met by these windows: 30 days is too early and 2 days is too late. Notice B needs its own path. Per Grant 3:00, build NO send path that can fire. Drafts are in Stacy 1501. After Jim's yes it would be a separate pinned step (for example a 14-day trial-only window at Feb 15, 2027, behind its own off-by-default flag).
- **Dec 12-16 notice:** VOID (1457). No function, template or cron job ties to it (cron.job read-only). It exists only as drafts (GRANT-JAN1-LAUNCH-INVENTORY 9.2, JIM-TAPS.md:1173). DROP. It is replaced by Notices A and B.

## 4. Copy inventory
- File: INVENTORY-BASE-MAR1-COPY-v1.md (this folder). It has file:line, repo, live vs main, owner, current text, and proposed S-id or <STACY RE-RULE>.
- Mine (Avery, backend and emails): 28 user-facing items. These are Jules's 23 romrxbjj-v2 strings (arl_copy, renewal email, welcome, assessment and lead emails) plus 5 I added (2 versions, consent S3, Reminders line, cascade line). 9 of them are pack copy. Also 9 code/constant sites.
- Jules's (sites), per his inventory:
  - romrx.io: 39 YES + 9 CHECK live
  - BJJ: 2 + 5
  - BB: 3 + 4
  - plus 17 only-in-main YES
- No-card: 27 live and 37 main scan rows (romrx.io, BB athletes.html:307). All VOID for Base; replace with Stacy 5a. 0 server hits.
- Pack copy is listed separately (INVENTORY section 4).
- Post-Mar-1 paid strings: not cleared (Stacy).

## 5. Promo codes OFF for Base: see section 1.

## 6. activate-beta-base cap keyed to the constant (FLAG: Mar 1 vs Dec 31)
- Reuse the immediate-branch cap pattern: refuse (402 checkout_required) at or after the cap, before any read or write, whatever the flags say.
- Strong lean: cap at 1803920400 (Mar 1), the same single constant, per Jim's "card now" framing.
  - Tradeoff: one constant, no second date to drift.
  - Dec 31 would close the audit-temp door 2 months earlier (safer), but it adds a second instant that matches nothing else in the rule.
- Better still under "take a card now": close the audit-temp free unlock now, so it always returns 402. OPEN J5, Jim confirms. Audit temps would then use Stripe test mode like everyone else. Grant has not decided it.

## 7. 409 guard (still applies)
- v52 has no already-active guard on mode=base (only lead_already_claimed :148 and base_required :367). A trialing user who taps unlock again gets a second subscription with a second Mar 1 charge.
- Carry over the immediate branch's guard: if users.base_status is active and base_stripe_subscription_id is set, return 409 already_active.
- Map it in the client to "You already have ROMRx Base." (Stacy to clear). No raw codes in the error box.

## 8. P6 (Mar 1, 2028 renewal)
- 17602(h) window (15-45 days) for 1835542800 (Mar 1, 2028, 12:00 PM EST) is Jan 16 to Feb 15, 2028.
- After D3, the windows give 45-day Sun Jan 16, 2028 and 30-day Mon Jan 31, 2028 (both inside), and 2-day Mon Feb 28, 2028.
- P6 text (Stacy STANDS) must be built and live before Jan 16, 2028, 7:00 AM ET.

## 9. Deploy plan (all via Supabase MCP deploy_edge_function, by name, never from main; before/after list_edge_functions plus get_edge_function hashes each step)
Order. Each step is pinned, Vera prechecked and Sable released.
- **D0 (read-only).**
  - Baseline the versions/ezbr: checkout v52 36abc3ba, webhook v59 3c60342d, renewal v32 3bcc783c, activate v18 c1bbafc2, welcome v40, submit-assessment v50, lead v36.
  - Re-capture submit-assessment v50 in full (MCP output was truncated).
- **D3 send-renewal-reminders (first; deadline Dec 2, 2026, 7:00 AM ET).**
  - Files: source/index.ts, source/logic.ts, source/email.ts, _shared/email_footer.ts. Entrypoint source/index.ts. verify_jwt false (cron caller check, as live).
  - Change: chargeAt prefers base_expiry.
  - Rollback: redeploy the v32 bytes (3bcc783c).
  - No behavior change until L1487, because base_expiry is still Jan 1 today.
- **D1 create-checkout-session (the fast-track constant job; must be live first for everything after).**
  - Files: source/index.ts, source/packs_gate.ts, _shared/arl_copy.ts, _shared/events.ts, _shared/rate_limit.ts. Entrypoint source/index.ts. verify_jwt true. import_map false.
  - Changes:
    - constant 1803920400
    - Dec 30 503 removed
    - J2 guard
    - paid branch at the constant
    - promo off for Base
    - 409 guard
    - S1/S3 text and v5 versions
  - Rollback: redeploy deploy-set-L1468 (v52).
- **D2 stripe-webhook (minutes after D1).**
  - Files: source/index.ts, _shared/arl_copy.ts (same constant and S8), other _shared as live. verify_jwt false.
  - Change: billing_consents.trial_end from the session's subscription, S8 ack, v5.
  - Rollback: v59 bytes.
  - Gap check (read-only SQL): any v5 consent with trial_end 2027-01-01 means a session completed in the gap. Flag it.
- **L1487 (Stripe, gated, section 3b).** After the D1/D2 post-check, before Dec 2, 7:00 AM ET.
- **D5 activate-beta-base.**
  - Files: index.ts. Change: the cap at the constant (or always 402, J5). verify_jwt as live.
  - Rollback: v18 bytes (c1bbafc2).
  - Order: after D1 is live, so the Checkout path is ready when the free door closes.
  - Jules then removes the romrx.io activate call (ResultsPreview.tsx:178 block). Front-end rollback: revert that commit, redeploy the previous Netlify deploy.
- **D7 email copy** (send-s1-welcome-email, submit-assessment, submit-lead-assessment): S9 line with cancel info (never alone). Rollback: previous bytes.
- **D6 front ends (Jules):** copy per INVENTORY, the no-card lines, buttons, S2 beside the unlock button, and the activate call removed.
  - **Client signal:** read the cutover from config rather than hardcoding it: a public config read (base_trial_end_unix = 1803920400, base_paid_now = now >= it) from the checkout function's OPTIONS or GET, reused from the immediate branch config read. Before it, show S2/S4. After it, show the post-Mar-1 strings.
- **Later:** Notice B path (after Jim), P6 by Jan 16, 2028, and post-Mar-1 strings by Feb 27, 2027.

## 10. Test plan (reuses the immediate branch Deno harness and run-mutants-v2.py; no Stripe calls, no billing test)
- **Unit:**
  - planBaseCheckout before/after
  - inFreePeriod
  - packs_gate equals arl_copy
  - promo false on Base params
  - payment_method_collection "always"
  - 409 when active with a sub
  - no 503 at Dec 30
  - J2 guard window
  - webhook consent trial_end from the subscription
  - renewal chargeAt prefers base_expiry
  - activate cap
- **Boundary at 1803920400 +/- 1 s:**
  - trial_end present at -1 s, absent at 0 and +1 s
  - J2 at 1803747600 +/- 1 s
  - Renewal windows on Jan 15/30 and Feb 27, 2027, and Jan 16/31 and Feb 28, 2028 (America/New_York).
- **Mutants:** flip the comparisons (< / <=), drop proration none, drop promo false, swap the constant, remove the 409 guard, remove the chargeAt preference. Target: all killed.
- **Dry run:** the read-only session-params printer (immediate branch) prints trial_end, payment_method_collection and allow_promotion_codes for "now" and for simulated instants. No session is created.

## 11. Screenshot request (Stacy 1459 flag 7, Grant)
- NOT taken, NOT planned. It conflicts with Jim's standing Nov 15 rule: "no Stripe test checkout or screenshot ever" (never build, prep or list a billing test). It needs Jim's own word through Sable.
- Read-only alternative:
  - the session-params dry run (section 10)
  - after go-live, a read-only API retrieve of trial_end on the real subscription objects (L1487 post-check)
  - Stripe derives its Checkout trial line from those parameters.

## 12. Cancel while trialing (17602(c), Stacy flag 5): confirmed from code (read-only)
- create-portal-session v28 index.ts:40 CANCELABLE = active, trialing, past_due.
- :158 re-checks the Stripe status.
- :165-166 opens portal flow_data subscription_cancel for the caller's own sub. Gated at :105 on usingTest || ARL_LIVE.
- The webhook converts a scheduled cancel to an immediate cancel (v59 index.ts:672-692).
- So online cancel works while trialing (when ARL_LIVE is on, as it was for the live consent).

## Open decisions for Jim (via Sable)
- J1. Card at account creation (before the free assessment) or at unlock as today? Plan assumes at unlock, which matches S6/S7.
- J2. The last 48 h (Feb 27, 12:00 PM to Mar 1, 12:00 PM ET): (a) 503 with Stacy's text [recommended], (b) trial_period_days, (c) setup-mode plus server subscription.
- J3. Packs earliest-open moves to Mar 1 with the constant: OK?
- J4. If Dec 2, 7:00 AM ET is at risk, hold renewal sends (RENEWAL_BASE_SEND)?
- J5. activate-beta-base: cap at Mar 1 (strong lean) vs Dec 31, or close it now.
- J6. Leave billing_consents.trial_end as the disclosed record (recommended) or add a column.
- J7. Notices A and B: send approval and channel (drafts only; no send path exists).
- J8. Screenshot: Jim's own word needed. The read-only alternative is offered.
- Stacy: post-Mar-1 paid strings (S1/S3/S8 paid variants), the renewal-email trial wording, the 409 line, and the pack copy re-rules.
