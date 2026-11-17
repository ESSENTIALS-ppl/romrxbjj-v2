# P1-25 Privacy section 4 (v4): Notion line, draft for Vera's read (NOT posted, NOT shipped)

Drafted by Avery, Tue Nov 17 2026, about 6:55 AM ET (America/New_York). Text file only. Nothing was posted to Notion or published.

## Sources
- Spec and cleared words: Stacy, process/evidence/STACY-P1-25-NOTION-TRASH-AND-DELETION-TEMPLATE-20261116-2120.md (b3197db6), section 1, "Exact v4 edit, one sentence"; ledger L1386 (2026-11-16 9:23 PM ET) item (2): "Jules adds to P1-25 legal.html build; no manual trash emptying."
- Base text: Stacy v4, process/evidence/STACY-P1-25-PURGE-PRIVACY-LINE-v4-20261116-2031.md (ce539b0b).
- Live page: https://romrx.io/legal.html (r9, read Tue Nov 17 about 6:45 AM ET). Section 4 still shows the OLD sentence below.

## The exact line

Old (live now, section 4, sentence 2):
> If we copied your feedback into our Notion workspace, we delete that copy too.

New (Stacy b3197db6, word for word):
> If we copied your feedback into our Notion workspace, we delete that copy too, and Notion permanently erases it within 30 days.

Only this sentence changes. The rest of v4 stays as live.

## Section 4 paragraph with the new line (for context; the contact address is shown as a placeholder)
> When you ask us to delete your data, we delete your account and the personal information tied to you, including your feedback and your app activity records. If we copied your feedback into our Notion workspace, we delete that copy too, and Notion permanently erases it within 30 days. A few remaining records tied to your account are permanently erased 90 days after your deletion is completed, and a short-term safety copy of those records is deleted within 8 days after that. We keep only these records: the billing terms you agreed to; records of the consents you gave or withdrew, such as reminder opt-ins, with the link to your account removed; and app usage data that is not linked to any account. If you used your account's email address to join a waitlist or to send us a form, we delete those sign-ups along with your account. If you signed up without an account, or want app usage linked to a sign-up removed, email [PRIVACY CONTACT ADDRESS AS PRINTED ON LIVE legal.html, unchanged] and we will delete it. We keep the billing and consent records to show what was agreed to and when, and to meet our legal duties. Stripe keeps its own payment records on its own schedule.

The placeholder is used only because this file may contain only hello@, reid@ or user@example.com addresses. The build must keep the live address exactly as it is; this edit does not change it.

## Match against live deletion behavior (for Vera)
| Claim in the new line | Live behavior | Match |
|---|---|---|
| "we delete that copy too" | Runbook step 7 (MANUAL, after a successful completion apply): delete the feedback-to-notion page(s) found at dry run; owner on file Reid (4cc29815, L1303), conflict with v6 open (see RUNBOOK-P1-25-v6.1-20261117.md). Not done by SQL. | Yes, as a binding runbook step (same basis as Vera baacd207 item 2 WARN) |
| "Notion permanently erases it within 30 days" | A Notion delete moves the page to trash; Notion keeps trash 30 days, then erases it (Grant's fact in b3197db6). No manual trash emptying. | Yes (per Stacy and Grant's fact; not independently verified against Notion's current terms in this draft) |

Purge timing in the SAME paragraph (not part of the Notion line, but Vera should know):
- "permanently erased 90 days after your deletion is completed" and "safety copy ... deleted within 8 days after that" describe job 14 (purge_deleted_accounts('apply', interval '90 days'), daily 04:23 UTC; backup kept 7 days, dropped by a later daily run).
- **Job 14's first run (Mon Nov 16 11:23 PM ET, runid 22334) FAILED** on the storage.objects delete guard. Every apply run will fail the same way until the purge is fixed, so today the 90-day erase would not happen.
- No customer is affected yet: account_deletion_requests is empty, so nothing can qualify before 90 days after the first completed deletion.
- Evidence: PURGE-RUN-1-JOB14-20261117.md. This mismatch is in the existing live sentence, not in the Notion line.

## Checks
- Addresses in this file: only user@example.com (in the rule note above); the contact address is a placeholder.
- No em dashes in the new line.
- Not posted.
