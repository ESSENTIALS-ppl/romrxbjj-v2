# RECEIPT: P1-25 purge v5.2 — lead/waitlist runbook path + Privacy line v3, 2026-11-16 8:15 PM ET (Avery)

BUILD ONLY. No apply_migration, no live writes, no deploys, no cron changes, no setting changes, no change to any live process. Receipts v1 (5c8ee929), v2 (af4fd317), v3 (d90583cd), v4 (c1744b6c), v5 (f9c6886f), v5.1 (b8eab0ae) and SHA256SUMS through SHA256SUMS-v5.1 (73a8d5b3) were not edited. This file is additive, with `SHA256SUMS-v5.2`. Live reads were a catalog of waitlist/pre-account tables and a pre-edit grep count of the Privacy Policy contact address already on legal.html. Nothing is applied or scheduled. The 90-day purge does nothing until it is applied and scheduled.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Grant's v5.2 calls (8:13 PM ET) and what was done

1. Stacy's Privacy line v3 (`STACY-P1-25-PURGE-PRIVACY-LINE-v3-20261116-2011.md`) sha256 verified **85d19e45078093f8e10f2bf6db9c6eb2f46f73cc760ace5fd03da5b44ba60786** (starts 85d19e45) before use. The v3 text is the v2 AFTER text with N=8, plus one new sentence after the kept-records list: waitlist sign-ups and linked usage are kept separately from the account and are deleted on request via the Privacy Policy contact address already printed on legal.html. Applied as a new commit on romrx-io-web `feat/p1-25-purge-privacy-line-20261116`.
2. **Pre-edit grep, before any v3 change, on both 29eb4fa6 and 7e8190ae:** the Privacy Policy contact address already used on legal.html was present. Exact occurrence count **11**, `mailto:` count **5**, matching-line count (`rg -c`) **6**, on both revisions (v2 did not add a mention). Workdir at 7e8190ae matched. Because the address was already there, the v3 edit proceeded. After the v3 edit (one new mailto on the same paragraph line): exact 13, mailto 6, matching lines still 6. legal.html-bearing patches are held out of evidence git.
3. **Docs only** on romrxbjj-v2 `feat/p1-25-purge-v5-20261116`: a new runbook section for a Privacy Policy contact-address deletion request from a lead or waitlist person who does not have an account. Manual SQL, placeholder `:email` only, never a real address. No code or SQL migration change.

## Identity

- Repo romrxbjj-v2, branch `feat/p1-25-purge-v5-20261116` off **1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae** (v4). New tip **82597b573d8c697351f8e6b2fc5e28605e6ec378** (v5.2, 8:14:51 PM ET) on c3e04415, plain push, `git ls-remote origin refs/heads/feat/p1-25-purge-v5-20261116` = 82597b57. Not applied.
- Patch sha256 (`git format-patch --stdout 1c3f1d82..82597b57`, whole v5 through v5.2; evidence copy `1c3f1d82-82597b57.patch`, held back): **5035ec0ca5911bbb15818a2d6109956e41aa23e2982f2cf815048093cc197afc**
- Single-commit patch sha256 of 82597b57 (`format-patch -1`): 8fd0ab436f96312b6f4e1c136988a47b0b9874191f4fc09c3587663b25cc9444
- `git patch-id --stable` of the whole change (`git diff 1c3f1d82 82597b57`): **770eb5abacf4081e64851356a753ade176eeabaf**. Per new and prior v5 commits: 06c604d4 **d9c1ab561cfca73fbcb3130ed3f10a7f73613431**; 24508e01 **867ac60beb970239eb279e306fcbf72aa13a0958**; c3e04415 **d19981929e59ecbbc299b008f0ec37898b8d0c13**; 82597b57 **bacbbdf81d8881dacb325f8149583be71decc014**.
- Runbook v5.2 `docs/p1-25/RUNBOOK-COMPLETION-v5.md` (evidence copy `RUNBOOK-COMPLETION-v5.2.md`; v5 45881e66 and v5.1 47a55cc0 left as they were): **faf23da20b7c589731b3a098c001664804fc6755d1090b49b906586e968e7926**
- Build notes v5.2 (evidence copy `BUILD-NOTES-v5.2.md`; earlier copies left as they were): **f1cce8d96a7e94fbf8ebe581f994a4d477fd1fbccf3f036963b6b4b6b7efd1ca**
- Hook SQL, hook rollback, day-90 purge SQL, and the unapplied cron files: unchanged from v5.1.
- Privacy sentence: repo romrx-io-web, branch `feat/p1-25-purge-privacy-line-20261116` off **29eb4fa66f920450d71c44e6edbad123cfd38596**. New tip **39b79d693ef2bc74bb5533000fb5d33affddec9a** (8:14:52 PM ET author / 8:14:57 PM ET commit) on 7e8190ae, plain push, `git ls-remote` = 39b79d69. legal.html sha256 **6efc9b24a83dcfb848ea82fba0328ed9e82b7c4b9f3af323134357fee339864e**. Patch sha256 of `git format-patch --stdout 29eb4fa6..39b79d69` (held back): **d2b8bfa6e7ca5a816a9d98c781ea0787d6714cb7409a27f3320ce87a783e35c2**. `git patch-id --stable` of the whole web change (`git diff 29eb4fa6 39b79d69`): **c8e788469f28b404973d18da701d17d6662eee51**. Per commit: 7e8190ae **f5128116ef8a5a2f5681eb9a6f4f12edc91e73f5**; 39b79d69 **510ce7e179e530a953dca3dfec47413b21c54b50**.

## Exact hunks changed (82597b57, romrxbjj-v2)

1. `docs/p1-25/RUNBOOK-COMPLETION-v5.md` — exactly 1 hunk `@@ -9,3 +9,93 @@`: adds the section "Lead or waitlist deletion request (no account)" after step 7.
2. `docs/p1-25/BUILD-NOTES-v5.md` — exactly 1 hunk `@@ -75,3 +75,30 @@`: this v5.2 section.

No change to any SQL, trigger, test, or cron file.

## Exact hunks changed (39b79d69, romrx-io-web)

1. `legal.html` — exactly 1 hunk `@@ -112,7 +112,7 @@`. Replaces the v2 AFTER text in Privacy section 4 "Your rights" with Stacy's v3 AFTER text (v2 with N=8, plus: "If you also signed up for our waitlist or updates, that sign-up and any app usage linked to it are kept separately from your account. Email [the Privacy Policy contact address already on this page] and we will delete them too."). The new mention uses the same `mailto` markup already used on the page. The rest of the paragraph is unchanged. Last-updated lines are unchanged (Terms: October 28, 2026; Privacy: November 16, 2026). `grep` for the literal `{N}` on the committed file: no matches. **This edit must ship in the same release that applies the completion hook AND applies and schedules the 90-day purge, never separately.**

## Pre-edit contact-address grep (required before the v3 commit)

On legal.html at **29eb4fa6** and at **7e8190ae**, before the v3 edit, a fixed-string count of the Privacy Policy contact address already printed on the page:

| Revision | Exact occurrences | `mailto:` counts | Matching lines (`rg -c`) |
|---|---:|---:|---:|
| 29eb4fa66f920450d71c44e6edbad123cfd38596 | 11 | 5 | 6 |
| 7e8190ae1facf81455fccc9cb7858015c5ccc073 | 11 | 5 | 6 |

The address was already present, so the edit was not stopped. After 39b79d69: 13 exact, 6 mailto, 6 matching lines (the new sentence is on the same paragraph line).

## Lead or waitlist runbook path

Live catalog, read-only, 8:14 PM ET, project cqzvqzwwevnflinxgnpp. `describe_tables` plus a `pg_class` name filter for waitlist / inquiry / tester / lead / investor / partner / yoga. Tables found with an `email` column:

- `public.leads` (id uuid, email text)
- `public.sport_pack_waitlist` (email text)
- `public.investor_requests` (email text)
- `public.partner_inquiries` (email text)
- `public.yoga_testers` (email text)

The new runbook section is a separate path from steps 1-7. It is for a Privacy Policy contact-address request from a lead or waitlist person with no account. If the email is on `auth.users`, or a matching lead has `converted_user_id` set, the operator stops and uses the account-deletion hook instead. It also refuses 7c71e421, `ops.internal_accounts`, and test fixtures. Dry-run `SELECT count(*)` per table (leads, the four lists, and `product_events` whose `props->>'lead_id'` is in those lead ids) is recorded first (date/time ET, request ref, counts; never the email or name). Deletes run in one transaction, `product_events` first while the lead ids still exist, then leads and the four lists. The six counts are re-run after and must be 0. SQL in the runbook uses the placeholder `:email` only. No migration or function was added.

## Times (America/New_York)

- Stacy v3 sha verified: 8:13 PM ET (file starts 85d19e45)
- Pre-edit legal.html grep on 29eb4fa6 and 7e8190ae: 8:13 PM ET
- Live waitlist table catalog: 8:14 PM ET
- Commit 82597b57: 8:14:51 PM ET; plain push and ls-remote: 8:15 PM ET
- Commit 39b79d69: 8:14:52 PM ET author, 8:14:57 PM ET commit; plain push and ls-remote: 8:15 PM ET
- This receipt: 8:15 PM ET

No live writes. Nothing applied, deployed or scheduled. The 90-day purge does nothing until it is applied and scheduled.
