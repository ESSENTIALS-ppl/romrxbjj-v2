-- L1487 DB rollback. READY, NOT RUN. Run only together with the Stripe rollback (l1487_rollback.ts, set L1487-SUB-MOVE),
-- only with Sable's release, and only before Wed Dec 30, 2026, 12:00 PM ET (1798650000). After that the move is one-way.
-- billing_consent_amendments is append-only (trigger billing_consent_amendments_guard): rollback APPENDS a row, never deletes.
-- Original consent 08071ffd-8810-444b-a801-595c9ac6557d is not touched by this either.
begin;
select case when now() >= to_timestamp(1798650000) then 1/0 end as abort_if_past_dec30_noon_et;  -- raises after the window
insert into public.billing_consent_amendments
  (parent_consent_id, amendment_kind, user_id, stripe_subscription_id, old_trial_end, new_trial_end, reason,
   stripe_changed_at, stripe_idempotency_key, stripe_request_id, notice_version, notice_sha256, notice_sent_at,
   terms_version, terms_effective_date, livemode)
select a.parent_consent_id, 'trial_end_move_rollback', a.user_id, a.stripe_subscription_id, to_timestamp(1803920400), to_timestamp(1798822800),
       'Rollback of L1487 (amendment 8e32fba3-96f8-4dbe-b9d7-5f05160a4034), authorized by Sable',
       '<STRIPE ROLLBACK EVENT created, from Stripe>'::timestamptz,   -- fill from the real Stripe event; no backdating
       'L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800', '<STRIPE ROLLBACK request id>', null, null, null,
       a.terms_version, a.terms_effective_date, true
from public.billing_consent_amendments a
where a.id = '8e32fba3-96f8-4dbe-b9d7-5f05160a4034'
on conflict (stripe_idempotency_key) do nothing
returning id, amendment_kind, old_trial_end, new_trial_end;          -- expect exactly 1 row
-- users.base_expiry: the webhook resyncs it on customer.subscription.updated. Only if it does not within 10 minutes:
update public.users set base_expiry = to_timestamp(1798822800)
 where id = '21647e5a-cca0-48c8-8203-1786db2f39d3' and base_stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b'
   and base_expiry = to_timestamp(1803920400)
returning id, base_expiry;                                            -- expect 0 (webhook did it) or 1
commit;
-- The migration itself is not rolled back (table is inert if unused). A DROP would be a delete: needs Jim's yes.
