-- DRY RUN: no record file yet; placeholders shown
-- Exactly one row. Original billing_consents row is not touched (read in the subquery only).
begin;
insert into public.billing_consent_amendments
  (parent_consent_id, amendment_kind, user_id, stripe_subscription_id, old_trial_end, new_trial_end, reason,
   stripe_changed_at, stripe_idempotency_key, stripe_request_id, notice_version, notice_sha256, notice_sent_at,
   terms_version, terms_effective_date, livemode)
select c.id, 'trial_end_move', c.user_id, c.stripe_subscription_id,
       to_timestamp(1798822800), to_timestamp(1803920400), 'Jim decision Nov 24, 2026, 2:55 PM ET, relayed by Sable through Grant: first ROMRx Base charge moved from January 1, 2027 to March 1, 2027.',
       '<FROM_APPLY_RECORD stripe_changed_at>'::timestamptz, 'L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400', '<FROM_APPLY_RECORD stripe_request_id>', null, null, null,
       '<TERMS_VERSION>', date '2026-12-31', true
from public.billing_consents c
where c.stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b' and c.livemode and c.offer = 'base'
  and c.trial_end = to_timestamp(1798822800)
  and (select count(*) from public.billing_consents x where x.stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b') = 1
on conflict (stripe_idempotency_key) do nothing
returning id, parent_consent_id, amendment_kind, old_trial_end, new_trial_end, stripe_changed_at, recorded_at;
-- Expect exactly 1 row returned (0 on a repeat = already recorded). If 0 on first run: rollback; and stop.
commit;
-- After (read-only): select amendment_kind, old_trial_end, new_trial_end, stripe_changed_at, notice_sent_at
--   from public.billing_consent_amendments where stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b' order by recorded_at;
-- And the original is unchanged: select trial_end from public.billing_consents where stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b';  -> 2027-01-01 17:00:00+00
