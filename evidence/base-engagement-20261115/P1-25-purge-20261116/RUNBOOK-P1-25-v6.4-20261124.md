# Account deletion completion: runbook entry (P1-25 v6.4, 2026-11-24)

v6.4 supersedes v6.3 (RUNBOOK-P1-25-v6.3-20261124.md, 8c08e782469470b1eb15bc5ddc178e1b414b0dbdf16df277eedf5e7828c77dab), which is left unchanged. Only change from v6.3: D1 adds Sable's ruling (relayed by Grant, Tue Nov 24 2026 3:00 PM ET): "No hand invoke of the drain without Sable's explicit OK each time."


v6.3 supersedes v6.2 (docs/p1-25/RUNBOOK-P1-25-v6.2-20261124.md, 5bc73fb6c9b6f4e7b0e8a71ae5d76d5b9ed51d6f1ce965a67120f472a5c37606, Vera 5a67029b VERIFIED with W1). v6.2 is left unchanged. Changes from v6.2 only:
- (a) Vera W1 (5a67029b item 4d): D2 now runs after the drain, not "after 12:30 AM ET" (in EDT the cron drain is 12:53 AM ET).
- (b) Live state: the purge fix was applied Tue Nov 24 2026 2:41 PM ET as migration 20261124194129 (L1469 step 1). The drain function is not deployed yet and the drain cron is not applied.
Everything below the v6.2 header is v6.2 text except those two edits.


Supersedes RUNBOOK-P1-25-v6.1a-20261117.md (09ab8b5a248e3b9759db0becb076b16972133157d28919f1c35c3227b85dcbcf, pinned L1441, Vera check ed4263a0: VERIFIED, 3 WARN). v6.1a, v6.1, v6 and every older copy are left unchanged. Written by Avery, Tue Nov 24 2026 (ET). DRAFT for Vera's read and Margot's pin.

Changes from v6.1a (Grant's final spec, Nov 24):
- (1) Step 7: trashing the Notion page on the same day the deletion is completed is a HARD step (Vera WARN 2 on the Notion line).
- (2) Step 7: 30 days becomes 60 days (Notion: 30 days in Trash, then 30 days retained before it is inaccessible to all workspace users).
- (3) Step 8 uses Stacy's v4 template sentence (STACY-P1-25-NOTION-LINE-v4-20261117-0706.md, sha 0ababd9dec1c1a1a63cc8ddccb1f18a89901012992468058b8cc298f7d96da90, verified today).
- (4) New section: Storage queue drain and daily queue check (clears Vera F1 together with the drain addendum).
- (5) Vera v6.1a WARNs carried (ed4263a0): W1 live cron count re-read today, not assumed; W2 drain step added and step 8's 90-day condition now requires it; W3 the old "steps 1 to 7" (line 29) and "steps 1-7" (lines 91 and 95) now say steps 1 to 8 / steps 1-8.
- (6) Known item W2 (progress-photo-path orphan gap) recorded.

Go-live gate (in this order): v6.2 lands (Vera read, Margot pin); then the purge fix (e0b34625 + drain) is live and job 14 has one good run; then Vera reads the live text.

## Live state (read-only, Tue Nov 24 2026 2:10 PM ET, MCP execute_sql)

- Applied Mon Nov 16 via MCP apply_migration (receipt a384fed0, Vera post-check 13ab56a7):
  - `20261117013401` p1_25_completion_cleanup (8:34:01 PM ET, hook 4b437b4b)
  - `20261117013410` p1_25_purge_deleted_accounts (8:34:10 PM ET, purge 19177ae6)
  - `20261117013428` p1_25_purge_deleted_accounts_cron (8:34:28 PM ET, cron 03823f26)
  - Rollbacks are not applied: cron 4ca72fee, purge 8de3190b, hook 119baaea.
- Purge fix APPLIED Tue Nov 24 2026 2:41:29 PM ET via MCP apply_migration as `20261124194129` p1_25_purge_storage_queue (L1469 step 1; SQL 1f48a120, rollback 2bebef4a staged, not applied). Purge body now pg_get_functiondef md5 062fa5a33166f62fb8b6c8e357004880, prosrc md5 cb7bde65b246fd50e107f5dcb6571641 (was 8cb6f2a6 / 83a03867), SECURITY DEFINER, execute for postgres and service_role only. public.p1_25_storage_delete_queue exists (RLS on, no policies, no anon or authenticated access), 0 rows. The drain function p1-25-storage-drain is NOT deployed yet; the drain cron is NOT applied.
- Job 14 `purge-deleted-accounts-daily`, schedule `'23 4 * * *'` UTC, runs `select public.purge_deleted_accounts('apply', interval '90 days');` as postgres.
  - That is 11:23 PM ET while Eastern Standard Time is in effect and 12:23 AM ET during daylight time.
- Cron: do not assume a count. Re-read it on the day you use this runbook:
  - `select count(*), md5(string_agg(jobid||'|'||schedule||'|'||command||'|'||active::text, E'\n' order by jobid)) from cron.job;`
  - `select md5(command) from cron.job where jobid = 1;` must be caab15b0a3b771bccfd127f7c3db4df2. Never touch job 1.
  - Today's read: 16 jobs, md5 40f1bf17f5b12e0cd32c190f928ef609 (jobs 1 to 15 aecaf67e; job 16 send-push-notification-hourly). If the optional drain cron is applied later, the count goes up by 1.
- **Every run has FAILED: 8 of 8** (runids 22334, 22474, 22622, 22770, 22918, 23066, 23214, 23362; Mon Nov 16 to Mon Nov 23, each at about 11:23 PM ET):
  - Error: "Direct deletion from storage tables is not allowed. Use the Storage API instead." (storage.protect_delete, a statement-level BEFORE DELETE trigger on storage.objects; purge body line 793).
  - Each transaction rolled back: 0 rows touched, no backup schema left behind. 0 accounts qualified anyway (account_deletion_requests total 0; storage.objects 0).
  - Every apply run will fail the same way until the purge fix (e0b34625 + drain addendum) is live. Evidence: PURGE-RUN-1-JOB14-20261117.md.
- **Until the purge fix is live, the drain is live, and one run succeeds, the 90-day erase and the 8-day safety-copy delete do not happen.**
  - Nobody is affected today: no completed deletion exists, so the first account could qualify no earlier than 90 days after the first completion.
  - Owner of the fix: Avery (built, pending pin and release). Account completion itself (steps 1 to 8) does not use the purge and is not affected.
- Daily check, read-only (Reid may run it):
  - `select runid, status, start_time, end_time, left(return_message, 200) from cron.job_run_details where jobid = 14 order by runid desc limit 3;`
  - If a run status is `failed` with any message other than the known storage error, tell Grant the same day.

## Who does what

- Avery runs every production DELETE: the apply call of `p1_25_complete_account_deletion`, and the lead/waitlist deletes in the no-account path.
- Reid does intake, read-only checks, and the dry run. That includes identifying Notion page ids at dry run, while the `client_feedback` rows still exist. Reid does not run production DELETEs in the database.
- **Step 7 owner: Reid.** romrxbjj-v2 4cc29815 adds "Owner: Reid." after step 7 (pinned L1303). Grant confirmed on Tue Nov 17 6:47 AM ET that the ledger overrides v6. Vera's post-check 13ab56a7 closed her Notion-owner WARN on that line.
  - Receipt a384fed0's line "The runbook names no owner for performing step 7" is superseded by 4cc29815 (Vera 13ab56a7, item 13).

## Where requests come in

Requests sent to hello@ follow the same path as requests sent to the privacy contact address printed on legal.html, which legal.html names for export and deletion. Use this same completion path for a request that arrives at either address.

## Notion copy (feedback-to-notion)

Live `feedback-to-notion` is version 24 (`index.ts`). It creates a page in the Notion database titled **Client Feedback** (title confirmed read-only from Notion; the title is also in the function comment at `index.ts:3`). The database id is not in the source. It is read from the secret / env var **`NOTION_FEEDBACK_DB_ID`** (`index.ts:14`, `index.ts:21`, used as `parent.database_id` at `index.ts:118`). Do not write that id into this runbook, a commit, or a receipt.

There is no dedicated Notion property for `user_id`. The page is tied to the `public.client_feedback` row by the **Notes** property, which includes the text `Supabase feedback id: ` plus `row.id` (`index.ts:93-97`, set on Notes at `index.ts:101`). "Client Name" is the title property and is only the local part of `metadata.email`, not a stable user or row id (`index.ts:88-89`, `index.ts:100`). Live `client_feedback` has no `notion_page_id` column. Identify page ids at dry run by searching Notes for those feedback ids; delete the pages only after a successful apply. Do not change the trigger or any code.

## Privacy log and completion record

v5 names "the privacy log" and "the completion record" but does not give a filesystem path. From the privacy runbook (`process/batches/staged/docs/PRIVACY-DELETION-EXPORT-RUNBOOK.md`, heading "The privacy log: what it records, where, and no PII", lines 114-118) and a live read-only schema check on 2026-11-16 (America/New_York), project cqzvqzwwevnflinxgnpp:

- **Privacy log.** (a) the `public.account_deletion_requests` row for the request. Live columns: `id`, `user_id`, `status`, `requested_at`, `updated_at`, `completed_at`. No count columns and no free-text column, matching the runbook. (b) a one-line note in the privacy-inbox thread for that request, which holds the counts and the second person. Identify the request by the thread date and by the `account_deletion_requests` request id (never the user id, email, or name).
- **Completion record.** There is no separate file or table with this name in the pack or in the live schema. The completion hook marks the request `completed` and stamps `completed_at` on that `account_deletion_requests` row. Dry-run counts, apply `erased` counts, times (ET), and Notion page ids deleted (or `none found`) go in the privacy-log thread note, next to the dry-run line, because the table cannot store them.


1. **The only allowed way.** `public.p1_25_complete_account_deletion` is the ONLY allowed way to complete a customer account deletion. Never use the Supabase dashboard "Delete user" button (or any other direct delete of `auth.users` / `public.users`) for a customer deletion: it skips the list, feedback and event cleanup.
2. **Before the call.** Finish privacy runbook section A steps 1-3 (safety copies erased, verified by Vera or Grant) and the Stripe, Resend and Storage-file steps.
   - Storage files must go through the Storage API or the dashboard Storage page; a SQL delete on storage.objects is blocked (see Live state).
3. **Dry run first, and record it.** Reid may run this.
   - Run `select public.p1_25_complete_account_deletion('<request id>');` (writes nothing).
   - Record in the privacy log: date and time (ET), the request id (never the user id, email or name), and the count per table from its `expected` object (public.leads, public.sport_pack_waitlist, public.investor_requests, public.partner_inquiries, public.yoga_testers, public.client_feedback, public.product_events, public.users, auth.users).
   - At this point Reid also identifies the Notion page ids (see "Notion copy" above).
4. **Real run with the recorded counts.** Avery runs this production DELETE.
   - Run `select public.p1_25_complete_account_deletion('<request id>', 'apply', '<the recorded expected object>'::jsonb);`.
   - If the counts now differ from the recorded dry run, or the rows actually erased differ, it stops with an error and erases nothing.
   - Then stop: do not retry with new counts until Vera or Grant has looked at why they changed, and record a new dry run.
5. **One transaction.** In that one call it:
   - clears leads, sport_pack_waitlist, investor_requests, partner_inquiries and yoga_testers for the account;
   - deletes the account's client_feedback and product_events rows;
   - deletes public.users and auth.users;
   - marks the request completed.
   - CASCADE also removes session_feedback, assessment_feedback, consents and user_ads_consent rows (live FKs, receipt a384fed0; Vera WARN 1 closed). These tables are not on the 90-day purge list.
   - It refuses 7c71e421, internal accounts and test fixtures. On any error it leaves the request open with nothing erased. No backup copy is made at completion.
6. Record the apply result's `erased` counts and the time (ET) next to the dry-run line in the privacy-log thread note.
7. **After the function runs (MANUAL). Owner: Reid (4cc29815, L1303).**
   - Find and delete the feedback-to-notion Notion page(s) identified at dry run, only after a successful apply.
   - Record the page ids deleted (or 'none found') and the date in the privacy-log thread note (the completion record).
   - **HARD STEP: move the page(s) to Notion's Trash on the same day (ET) as the step 4 apply.** Record the trash date and time (ET). If it cannot be done that day, stop, tell Grant the same day, and do not send step 8 until it is done; the 60-day clock in step 8 starts on the actual trash date.
   - A Notion delete moves the page to Notion's Trash. After 30 days in Trash and 30 days retained, Notion makes it inaccessible to all workspace users, including workspace owners: within 60 days of our deletion. Nobody needs to empty the trash by hand (Stacy v4 0ababd9d, L1386).
   - Do not change the trigger or any code.
8. **Deletion confirmation email (Reid; after step 7, never before).**
   - Send Stacy's template (process/evidence/STACY-P1-25-NOTION-TRASH-AND-DELETION-TEMPLATE-20261116-2120.md, b3197db6, section 2) to the address on the request only, with [date] = the actual completion date.
   - Replace the template's Notion sentence with Stacy's v4 sentence, exactly (STACY-P1-25-NOTION-LINE-v4-20261117-0706.md, 0ababd9d): "If we copied your feedback into our Notion workspace, we've deleted that copy, and within 60 days of our deletion no one in our workspace, including us, can access it."
   - Send only after step 7's same-day Trash is recorded.
   - Leave out the waitlist sentence if the dry run found no sign-ups, and the Notion sentence if no feedback was copied.
   - Gate: Stacy's clear plus Vera's read of the final live text, no Jim step (L1386).
   - Until the purge fix AND the storage drain are live and job 14 has run successfully once, Grant decides whether the template's 90-day and 8-day sentence may be sent as is (see Live state). Files at day 90 are erased only through the drain below.

## Storage queue drain and daily queue check (after the purge fix is live; not part of steps 1 to 8)

The fixed purge does not delete files. It queues each leftover Storage object (bucket and path) in public.p1_25_storage_delete_queue. The drain deletes them through the Storage API. Details and exact commands: docs/p1-25/ADDENDUM-P1-25-STORAGE-DRAIN-20261124.md.

D1. **Drain (Avery; whenever the queue count is above 0).** Edge function p1-25-storage-drain (option B), run by the optional cron job 'p1-25-storage-drain-daily' ('53 4 * * *' UTC, calls only when the queue is not empty) or by hand: `select public.cron_call_edge('p1-25-storage-drain', 120000);` then read the counts from net._http_response. For each queued file it deletes the file through the Storage API with the service role, then removes that queue row only after success or "not found". Any other answer keeps the row for the next run. Log start, deleted, already missing, failed and remaining to process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-DRAIN.log. Never delete storage.objects with SQL and never set storage.allow_delete_query. **No hand invoke of the drain without Sable's explicit OK each time.**
D2. **Daily queue-count check (Avery; read-only).** Once a day, AFTER the drain: after that night's drain job has run if one is scheduled; if no drain job is scheduled, run D1 first (on an empty queue it only reads the count) and then this check. Never before the drain. Run scripts/p1-25-storage-drain/daily-queue-check.sql (count, oldest queued_at, escalate_to_grant) and log one line to process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-QUEUE-CHECK.log. Count above 0: run D1.
D3. **Escalate.** If escalate_to_grant is true (any row waiting more than 24 hours), tell Grant the same day: count, oldest time (ET), and the last drain failures (masked paths only).

## Known items

- W2 (progress-photo-path orphan gap): an object with no owner and no owner_id, referenced only by a progress_photos path, is counted and backed up by the purge but never queued, so the drain cannot delete it. Visible when the apply result has storage_objects_queued < table_counts['storage.objects']; tell Grant the same day. Step 2 (Storage files deleted through the API at completion) is the mitigation. Exposure today: storage.objects 0. Fix in a later version. Note: docs/p1-25/KNOWN-ITEM-W2-P1-25-PHOTO-PATH-ORPHAN-20261124.md.

## Lead or waitlist deletion request (no account)

This is a separate manual path for a deletion request sent to the privacy contact address printed on legal.html or to hello@ (both follow the same path), from a person who is on a lead or waitlist and does not have an account. Do not use this path for a customer account deletion: use steps 1-8 and `p1_25_complete_account_deletion` instead. No function, trigger, or migration is changed by this step. Live tables confirmed read-only (2026-11-16, project cqzvqzwwevnflinxgnpp): `public.leads` (email, id uuid), `public.sport_pack_waitlist` (email), `public.investor_requests` (email), `public.partner_inquiries` (email), and `public.yoga_testers` (email). Match emails with `lower(btrim(...))`. Use the placeholder `:email` only; never paste a real address into the runbook, a commit, or a receipt.

Reid may do intake, the safety and dry-run counts, and the recording. Avery runs the production DELETEs.

1. **Safety first.** If this email is on an account, or a matching lead has `converted_user_id` set, STOP and use steps 1-8. If a match is account `7c71e421-929b-4691-a6bc-cc614ed2a08d`, is in `ops.internal_accounts`, or is a test fixture, do not delete. Record the request ref (never the email or name) and the reason you stopped.

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
