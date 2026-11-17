# Account deletion completion — runbook entry (P1-25 v5; supersedes RUNBOOK-COMPLETION-v4.md)

Applies only once migration 20261117010100_p1_25_completion_cleanup (v5 bytes) is applied. Until then this is not in use.

1. **The only allowed way.** `public.p1_25_complete_account_deletion` is the ONLY allowed way to complete a customer account deletion. Never use the Supabase dashboard "Delete user" button (or any other direct delete of `auth.users` / `public.users`) for a customer deletion: it skips the list, feedback and event cleanup.
2. **Before the call.** Finish privacy runbook section A steps 1-3 (safety copies erased, verified by Vera or Grant) and the Stripe, Resend and Storage-file steps.
3. **Dry run first, and record it.** Run `select public.p1_25_complete_account_deletion('<request id>');` (writes nothing). Record in the privacy log: date and time (ET), the request id (never the user id, email or name), and the count per table from its `expected` object (public.leads, public.sport_pack_waitlist, public.investor_requests, public.partner_inquiries, public.yoga_testers, public.client_feedback, public.product_events, public.users, auth.users).
4. **Real run with the recorded counts.** Run `select public.p1_25_complete_account_deletion('<request id>', 'apply', '<the recorded expected object>'::jsonb);`. If the counts now differ from the recorded dry run, or the rows actually erased differ, it stops with an error and erases nothing. Then stop: do not retry with new counts until Vera or Grant has looked at why they changed, and record a new dry run.
5. **One transaction.** In that one call it clears leads, sport_pack_waitlist, investor_requests, partner_inquiries and yoga_testers for the account, deletes the account's client_feedback and product_events rows, deletes public.users and auth.users, and marks the request completed. It refuses 7c71e421, internal accounts and test fixtures. On any error it leaves the request open with nothing erased. No backup copy is made at completion.
6. Record the apply result's `erased` counts and the time (ET) next to the dry-run line.
7. **After the function runs (MANUAL).** Find and delete the feedback-to-notion Notion page(s) for that user's client_feedback rows, and record the page ids deleted (or 'none found') in the completion record. Identify the page ids at dry run, while the client_feedback rows still exist, if the Notion copy is keyed off those rows; delete the pages only after a successful apply. Do not change the trigger or any code. Stacy will word the customer-facing part of this step.

## Lead or waitlist deletion request (no account)

This is a separate manual path for a deletion request sent to the Privacy Policy contact address already printed on legal.html, from a person who is on a lead or waitlist and does not have an account. Do not use this path for a customer account deletion: use steps 1-7 and `p1_25_complete_account_deletion` instead. No function, trigger, or migration is changed by this step. Live tables confirmed read-only (2026-11-16, project cqzvqzwwevnflinxgnpp): `public.leads` (email, id uuid), `public.sport_pack_waitlist` (email), `public.investor_requests` (email), `public.partner_inquiries` (email), and `public.yoga_testers` (email). Match emails with `lower(btrim(...))`. Use the placeholder `:email` only; never paste a real address into the runbook, a commit, or a receipt.

1. **Safety first.** If this email is on an account, or a matching lead has `converted_user_id` set, STOP and use steps 1-7. If a match is account `7c71e421-929b-4691-a6bc-cc614ed2a08d`, is in `ops.internal_accounts`, or is a test fixture, do not delete. Record the request ref (never the email or name) and the reason you stopped.

```
select
  (select count(*) from auth.users u
    where lower(btrim(u.email)) = lower(btrim(:email))) as auth_users,
  (select count(*) from public.leads l
    where lower(btrim(l.email)) = lower(btrim(:email))
      and l.converted_user_id is not null) as converted_leads,
  (select count(*) from public.leads l
    where lower(btrim(l.email)) = lower(btrim(:email))
      and (
        l.converted_user_id = '7c71e421-929b-4691-a6bc-cc614ed2a08d'
        or exists (select 1 from ops.internal_accounts i where i.user_id = l.converted_user_id)
        or exists (
          select 1 from auth.users u
          where u.id = l.converted_user_id
            and u.raw_app_meta_data->>'test_fixture' = 'true'
        )
      )) as excluded;
```

2. **Dry run first, and record it.** These statements write nothing. Record in the privacy log: date and time (ET), the request ref (never the email or name), and the count per table.

```
select count(*) as leads
from public.leads
where lower(btrim(email)) = lower(btrim(:email));

select count(*) as sport_pack_waitlist
from public.sport_pack_waitlist
where lower(btrim(email)) = lower(btrim(:email));

select count(*) as investor_requests
from public.investor_requests
where lower(btrim(email)) = lower(btrim(:email));

select count(*) as partner_inquiries
from public.partner_inquiries
where lower(btrim(email)) = lower(btrim(:email));

select count(*) as yoga_testers
from public.yoga_testers
where lower(btrim(email)) = lower(btrim(:email));

select count(*) as product_events_for_those_leads
from public.product_events pe
where pe.props->>'lead_id' in (
  select l.id::text
  from public.leads l
  where lower(btrim(l.email)) = lower(btrim(:email))
);
```

3. **Deletes in one transaction.** Only after the dry-run counts are recorded, and only if the safety checks were all zero. `product_events` must be deleted first, while the matching `public.leads` rows (and their ids) still exist.

```
begin;

delete from public.product_events pe
where pe.props->>'lead_id' in (
  select l.id::text
  from public.leads l
  where lower(btrim(l.email)) = lower(btrim(:email))
);

delete from public.leads
where lower(btrim(email)) = lower(btrim(:email));

delete from public.sport_pack_waitlist
where lower(btrim(email)) = lower(btrim(:email));

delete from public.investor_requests
where lower(btrim(email)) = lower(btrim(:email));

delete from public.partner_inquiries
where lower(btrim(email)) = lower(btrim(:email));

delete from public.yoga_testers
where lower(btrim(email)) = lower(btrim(:email));

commit;
```

4. **Count check after.** Re-run the six dry-run `select count(*)` statements. Each must be 0. Record the post counts and the time (ET) next to the dry-run line. If any count is not 0, stop and tell Vera or Grant; do not keep deleting.
