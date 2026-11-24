-- FALLBACK ONLY. STAGED, NOT APPLIED. Use only if, 10 minutes after the Stripe update, users.base_expiry is still
-- 2027-01-01 12:00 ET (the webhook did not sync: WEBHOOK_SYNC=NO, or the event failed). Needs pin + Vera + Sable.
-- Single row, pinned on the subscription id AND the old value. Touches users.base_expiry only. Never billing_consents.
-- BEFORE (read-only):
select id::text like '21647e5a%' as ok_user, base_status, base_expiry from public.users
 where base_stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b';             -- expect 1 row, 2027-01-01 17:00:00+00
-- CHANGE:
begin;
update public.users set base_expiry = to_timestamp(1803920400)
 where base_stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b'
   and id::text like '21647e5a%'
   and base_expiry = to_timestamp(1798822800)
returning id::text like '21647e5a%' as ok_user, base_expiry;                       -- expect exactly 1 row, 2027-03-01 17:00:00+00
-- If not exactly 1 row: rollback; and stop.
commit;
-- AFTER (read-only): same select as BEFORE -> 2027-03-01 17:00:00+00 (= Mar 1, 2027 12:00 PM ET).
-- ROLLBACK of this fallback (only together with l1487_rollback.ts): same statement with 1798822800 and 1803920400 swapped.
