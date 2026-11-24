-- L1487 read-only precheck (Vera). No writes. Expected values are from the 3:10 PM ET read on Nov 24, 2026.
select u.id::text like '21647e5a%'                                   as is_21647e5a,       -- true
       u.base_status,                                                                         -- active
       to_char(u.base_expiry at time zone 'America/New_York','YYYY-MM-DD HH24:MI') as base_expiry_et, -- 2027-01-01 12:00
       (select count(*) from public.billing_consents c where c.stripe_subscription_id = u.base_stripe_subscription_id) as consents, -- 1
       (select extract(epoch from c.trial_end)::bigint from public.billing_consents c where c.stripe_subscription_id = u.base_stripe_subscription_id) as consent_trial_end, -- 1798822800
       (select count(*) from public.renewal_reminders r where r.user_id = u.id) as reminder_rows -- 1 (45_day, Nov 17)
from public.users u where u.base_stripe_subscription_id = 'sub_1UVa8YDou9Iktbw0s4QIPS7b';
