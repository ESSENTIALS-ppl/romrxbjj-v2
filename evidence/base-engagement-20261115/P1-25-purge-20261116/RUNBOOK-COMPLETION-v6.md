# Account deletion completion — runbook entry (P1-25 v6; supersedes RUNBOOK-COMPLETION-v5.md at 4cc29815)

The v5 file is left unchanged (hashed pack copies and `docs/p1-25/RUNBOOK-COMPLETION-v5.md` at 4cc29815). This v6 entry is the one to use. The completion hook is already applied: 2026-11-16 8:34:01 PM ET (America/New_York) as migration `20261117013401` `p1_25_completion_cleanup` (same bytes as the former unapplied `20261117010100` v5 file).

## Who does what

- Avery runs every production DELETE: the apply call of `p1_25_complete_account_deletion`, the lead/waitlist deletes in the no-account path, and the Notion page deletes in step 7.
- Reid does only intake, read-only checks, and the dry run (including identifying Notion page ids at dry run, while the `client_feedback` rows still exist). Reid does not run production DELETEs.

## Where requests come in

Requests sent to hello@ follow the same path as requests sent to privacy@. v5 did not name either address; it referred to "the Privacy Policy contact address already printed on legal.html." legal.html names privacy@ for export and deletion. Use this same completion path for a request that arrives at either address.

## Notion copy (feedback-to-notion)

Live `feedback-to-notion` is version 24 (`index.ts`). It creates a page in the Notion database titled **Client Feedback** (title confirmed read-only from Notion; the title is also in the function comment at `index.ts:3`). The database id is not in the source. It is read from the secret / env var **`NOTION_FEEDBACK_DB_ID`** (`index.ts:14`, `index.ts:21`, used as `parent.database_id` at `index.ts:118`). Do not write that id into this runbook, a commit, or a receipt.

There is no dedicated Notion property for `user_id`. The page is tied to the `public.client_feedback` row by the **Notes** property, which includes the text `Supabase feedback id: ` plus `row.id` (`index.ts:93-97`, set on Notes at `index.ts:101`). "Client Name" is the title property and is only the local part of `metadata.email`, not a stable user or row id (`index.ts:88-89`, `index.ts:100`). Live `client_feedback` has no `notion_page_id` column. Identify page ids at dry run by searching Notes for those feedback ids; delete the pages only after a successful apply. Do not change the trigger or any code.

## Privacy log and completion record

v5 names "the privacy log" and "the completion record" but does not give a filesystem path. From the privacy runbook (`process/batches/staged/docs/PRIVACY-DELETION-EXPORT-RUNBOOK.md`, heading "The privacy log: what it records, where, and no PII", lines 114-118) and a live read-only schema check on 2026-11-16 (America/New_York), project cqzvqzwwevnflinxgnpp:

- **Privacy log.** (a) the `public.account_deletion_requests` row for the request. Live columns: `id`, `user_id`, `status`, `requested_at`, `updated_at`, `completed_at`. No count columns and no free-text column, matching the runbook. (b) a one-line note in the privacy@ thread for that request, which holds the counts and the second person. Identify the request by the thread date and by the `account_deletion_requests` request id (never the user id, email, or name).
- **Completion record.** There is no separate file or table with this name in the pack or in the live schema. The completion hook marks the request `completed` and stamps `completed_at` on that `account_deletion_requests` row. Dry-run counts, apply `erased` counts, times (ET), and Notion page ids deleted (or `none found`) go in the privacy-log thread note, next to the dry-run line, because the table cannot store them.

1. **The only allowed way.** `public.p1_25_complete_account_deletion` is the ONLY allowed way to complete a customer account deletion. Never use the Supabase dashboard "Delete user" button (or any other direct delete of `auth.users` / `public.users`) for a customer deletion: it skips the list, feedback and event cleanup.
2. **Before the call.** Finish privacy runbook section A steps 1-3 (safety copies erased, verified by Vera or Grant) and the Stripe, Resend and Storage-file steps.
3. **Dry run first, and record it.** Reid may run this. Run `select public.p1_25_complete_account_deletion('<request id>');` (writes nothing). Record in the privacy log: date and time (ET), the request id (never the user id, email or name), and the count per table from its `expected` object (public.leads, public.sport_pack_waitlist, public.investor_requests, public.partner_inquiries, public.yoga_testers, public.client_feedback, public.product_events, public.users, auth.users). At this point Reid also identifies the Notion page ids (see "Notion copy" above).
4. **Real run with the recorded counts.** Avery runs this production DELETE. Run `select public.p1_25_complete_account_deletion('<request id>', 'apply', '<the recorded expected object>'::jsonb);`. If the counts now differ from the recorded dry run, or the rows actually erased differ, it stops with an error and erases nothing. Then stop: do not retry with new counts until Vera or Grant has looked at why they changed, and record a new dry run.
5. **One transaction.** In that one call it clears leads, sport_pack_waitlist, investor_requests, partner_inquiries and yoga_testers for the account, deletes the account's client_feedback and product_events rows, deletes public.users and auth.users, and marks the request completed. It refuses 7c71e421, internal accounts and test fixtures. On any error it leaves the request open with nothing erased. No backup copy is made at completion.
6. Record the apply result's `erased` counts and the time (ET) next to the dry-run line in the privacy-log thread note.
7. **After the function runs (MANUAL).** Avery finds and deletes the feedback-to-notion Notion page(s) identified at dry run, and records the page ids deleted (or 'none found') in the privacy-log thread note (the completion record). Delete the pages only after a successful apply. Do not change the trigger or any code. Stacy will word the customer-facing part of this step.

## Lead or waitlist deletion request (no account)

This is a separate manual path for a deletion request sent to privacy@ or hello@ (the Privacy Policy contact address already printed on legal.html is privacy@; hello@ requests follow the same path), from a person who is on a lead or waitlist and does not have an account. Do not use this path for a customer account deletion: use steps 1-7 and `p1_25_complete_account_deletion` instead. No function, trigger, or migration is changed by this step. Live tables confirmed read-only (2026-11-16, project cqzvqzwwevnflinxgnpp): `public.leads` (email, id uuid), `public.sport_pack_waitlist` (email), `public.investor_requests` (email), `public.partner_inquiries` (email), and `public.yoga_testers` (email). Match emails with `lower(btrim(...))`. Use the placeholder `:email` only; never paste a real address into the runbook, a commit, or a receipt.

Reid may do intake, the safety and dry-run counts, and the recording. Avery runs the production DELETEs.

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

3. **Deletes in one transaction.** Avery only, and only after the dry-run counts are recorded, and only if the safety checks were all zero. `product_events` must be deleted first, while the matching `public.leads` rows (and their ids) still exist.

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

4. **Count check after.** Re-run the six dry-run `select count(*)` statements. Each must be 0. Record the post counts and the time (ET) next to the dry-run line. If any count is not 0, stop and tell Grant; do not keep deleting.
