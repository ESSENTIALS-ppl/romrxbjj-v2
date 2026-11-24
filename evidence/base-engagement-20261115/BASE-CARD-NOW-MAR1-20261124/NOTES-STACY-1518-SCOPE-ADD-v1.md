# Notes for Grant 3:20 PM scope add (Stacy 1518, sha 66272c03, read first-hand). READ-ONLY / DESIGN / PLAN ONLY.
Written Nov 24, 2026, about 3:45 PM ET (EST). Nothing here is applied, deployed or sent.

## Item 1. J6 amendment rows
Built in sets/L1487-SUB-MOVE:
- the migration (not applied)
- the render step for the insert (dry run plus a real record)
- a rollback that appends a row
- PGlite tests
Marked: **Sable decides if a fresh Jim yes is needed.** The original billing_consents row is never modified.

## Item 2. D3 trial-ending wording
Built in sets/D3-WEBHOOK-TRIALEND:
- The body is concern 15's first sentence plus the rest of P6. The cancel how-to is in every email that has a price or charge date.
- Renders for Jan 15, Jan 30 and Feb 27, 2027 at $60.
- Open for Stacy:
  - (a) The subject. My draft is "Your ROMRx Base beta launch trial period ends on March 1, 2027". Notice B 1530's subject is "...ends March 1, 2027", without "on". Stacy should pick one so both match.
  - (b) The "the card on file" fallback.
  - (c) The P6 phrase "for one more year" on a first charge.

## Item 3. Paid strings (from 1803920400)
- These do not fit in the Nov 30 sets, because arl_copy is pinned at cd9b2617 in S1 rev2 and in the combined webhook set. They are a separate small set; see sets/ARL-PAID-STRINGS-MAR1 if present, otherwise the next build.
- The ack should be keyed on the session's recorded arl_version, not on the webhook's clock, so a delayed event across the noon boundary still gets the right text.

## Item 4a. 409 second-subscription guard (concern 14). Design only
- Today, S1 rev2 mode=base has no "already has Base" check. A trialing user who taps unlock again gets a second Checkout and a second subscription.
- Design, in create-checkout-session mode=base, after the JWT check and before the lead claim:
  1. Read users(base_status, base_stripe_subscription_id) for body.user_id, using the admin client.
  2. If base_stripe_subscription_id is not null and base_status is in (active, trialing, past_due), return 409 {error:"base_already_active", checkout_url:null}.
  3. Belt and braces: Stripe subscriptions.list(customer, status=all, limit=10). Any subscription with metadata.purpose=base and a status in (trialing, active, past_due, unpaid, incomplete) also returns 409.
  4. App: on 409 base_already_active, route to Settings. The string needs Stacy.
- Tests:
  - A trialing user gets 409.
  - A canceled user is allowed.
  - A NULL sub id is allowed.
  - A Stripe list error fails closed with 503 and a retry message (Stacy string).
- Ships with or before the v6 late-window set.

## Item 4b. Combo charges Base only (concern 6)
- In S1 rev2 3b706ba8 (:191-:229), when PACKS_CHECKOUT_OPEN is not "true", the combo request is dropped to Base only, and a defense-in-depth check at :224 stops any pack line.
- If PACKS_CHECKOUT_OPEN is "true", combo adds a pack line with no trial_end, so the pack is charged.
- The env value cannot be read read-only, the same as FREE_UNLOCK_ENABLED. Vera should confirm it is unset or false.
- Code fix design: in mode=base, ignore pending_sport for line items in all cases until Stacy clears pack copy.

## Item 4c. Cascade check on the pack entitlements (concern 7). Read-only, counts only, Nov 24 3:39 PM ET
- 11 rows: 10 active and 1 canceled, across 10 users.
- 3 have a stripe_subscription_id. 0 are on any Base sub or any consent sub.
- 0 expire on Jan 1, 2027 or before Mar 1, 2027. 2 have a NULL expiry. 0 have cancel flags. 2 belong to excluded users.
- v59 still cascades a Base cancel to every pack (cancelAllSportPacksForUser :260, unchanged in the combined set). So "Canceling Base also cancels..." stays true.
- The L1487 move touches 0 pack rows.

## Item 5. Late-window templating set (PLAN ONLY; must be live before Fri Feb 27, 2027, 11:50 AM ET = 1803747000)
- Scope: S1 (checkout disclosure), S2 (app disclosure), S3 (consent box) and S8 (ack). They move to v6 (ca-arl-3b/3c-2027-03-01-v6) per Stacy F1-F4.
- {first_charge_date} and {renewal_month_day} come from the session's real trial_end, rendered in America/New_York as "Month D, YYYY" and "Month D".
- The date source is one server function, trialEndFor(now):
  - now < 1803747000: returns 1803920400.
  - 1803747000 <= now < 1803920400: returns now + 48 h 10 min.
  - now >= 1803920400: returns null, the paid path.
- create-checkout-session uses it for subscription_data.trial_end, and the same value for the S1/S3 text.
- The app reads the same value from a small config endpoint (or the session-create response), never from its own clock. A lockstep test compares the two.
- The webhook S8 reads trial_end from the subscription (subTrialEndIso, already in the combined set) and renders the dates from it.
- This set removes the remaining 503. S1 rev2 still returns 503 from BETA_TRIAL_END_UNIX - 48 h = Feb 27, 2027 noon ET. Grant 3:12 PM: no blocked window.
- Tests:
  - Boundary instants: 1803746999, 1803747000, 1803919999 and 1803920400.
  - The date renders "March 1, 2027" / "March 1" at the constant, and "March 2, 2027" etc. inside the window.
  - The 48 h Stripe minimum is always met.
  - P6 keys off each subscription's own date (F8).
- Order: the v6 set, then the paid-strings set (or one combined set), both before Feb 27, 2027 noon ET.

## Item 6. Notice A
- Stacy already issued final text with the Terms sentence: process/evidence/STACY-BASE-NOTICES-A-B-FINAL-20261124-1530.md, sha256 54ca69e61a6fec82b5734906b198256f60eb7fd72d5af179eea0d35cba799feb (SUMS OK).
- The last sentence of paragraph 1 is: "We've updated our Terms to reflect this change, effective December 31, 2026: https://romrx.io/legal". No separate draft is needed; I am referencing it, not duplicating it.
- Send rules:
  - Only after the L1487 move is confirmed at 1803920400.
  - By Thu Dec 17, 2026.
  - Only with Jim's yes.
  - Updated Terms must be live on romrx.io/legal first.
  - Vera rereads it.
- NO send path was built. The amendment row's notice_version / notice_sha256 / notice_sent_at are filled once, after the real send.
