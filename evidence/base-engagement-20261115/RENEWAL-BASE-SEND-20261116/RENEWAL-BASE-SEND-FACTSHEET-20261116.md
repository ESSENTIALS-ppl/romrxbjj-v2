# RENEWAL-BASE-SEND FACT SHEET (read only)

Written 8:16 PM ET Mon Nov 16 2026 by Avery, for Margot's pin and Vera's precheck, ahead of the Tue Nov 17 7:00 AM ET run. Supabase project `cqzvqzwwevnflinxgnpp`.

**Nothing was changed.** No secret was set or read by value, no cron was altered, no function was deployed or invoked, and no email was sent. The supabase CLI is not signed in on this computer (`AccessTokenRequiredError` on `supabase projects list` and `supabase secrets list`). There is no MCP secrets tool. Times below are America/New_York (ET).

Live reads: cron fingerprint 8:12:47 PM ET; due counts, vault-name check, and http-log check 8:13–8:14 PM ET; function metadata via `list_edge_functions` / `get_edge_function` 8:12 PM ET.

## 0. Ledger: do Jim's own words clear the Base renewal send?

Jim's cited words clear the **substance** of sending the Base renewal reminders (fix them, do not pause them; they can go with this batch; the text is OK; replies go to hello@). He has **never named** the secret `RENEWAL_BASE_SEND`. This fact sheet is the facts package L1151 required before a gate line, pin, and Vera precheck. Nothing is set in this step.

Jim's own words, quoted:

- **L1028** (Nov 15 8:21 PM ET), answering the card that asked whether to pause the renewal reminders: "That needs to be fixed not paused. Jan 1 is like 2 months away. Fix it."
- **L1033** (Nov 15 8:48 PM ET): "Renewal email can go with this batch"
- **L1142** (Nov 16 9:42 AM ET), on text `2bf843e3`: "Ok"
- **L1145** (Nov 16 9:42 AM ET): "Replies go to hello@, Reid triages them from my inbox."

Not Jim's words, but in the cite list:

- **L1151** (Margot, Nov 16 9:52 AM ET) records that Jim has never named `RENEWAL_BASE_SEND`, reads L1028 as answering send-or-pause, treats a further ask as a re-ask, and still requires a gate line naming the secret, the value and the time, with these facts attached, plus Vera's check, before anyone flips it. It also says Jim should be told before it flips, as an FYI, not asked.
- **L1172** (Vera post-check, Nov 16 10:03 AM ET) is a deploy receipt, not a Jim line. It confirms send-renewal-reminders **v27** is live, byte-identical to `1220116b`, text matching `2bf843e3`, cron job 1 unchanged. It leaves `RENEWAL_BASE_SEND` **NOT TESTED**.

Grant's relay tonight replaces his earlier hold and treats L1028, L1033, L1142, L1145, L1151 and L1172 as clearing the send, with this fact sheet due before 7:00 AM Tue ET, then a pin and Vera precheck, then the set once the token is in. L1228/L1229 (Jim's 7:54 PM ET "go") are not in that cite list and, on their own text, do not cover this secret.

## 1. Does RENEWAL_BASE_SEND exist, and what is its state?

**Unknown.** The name could not be confirmed, and the value could not be read.

| Check | Result |
|---|---|
| `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` | Failed: `AccessTokenRequiredError`. No CLI login, no `SUPABASE_ACCESS_TOKEN` on this computer. |
| MCP secrets tool | None exists. |
| `vault.secrets` names only (`name = 'RENEWAL_BASE_SEND'` or `name ilike '%renewal%'`) | 0 and 0. Edge-function secrets do not live in the database vault, so this does not prove the name is absent. No vault values were selected. |
| Logged cron responses for job 1 (`net._http_response`) | No send-renewal-reminders body is in the log now, so `send_enabled` for this flag is not visible. |

`net._http_response` at 8:13:51 PM ET held 12 rows, all HTTP 200, none timed out, from 2:15:00 PM ET through 7:30:00 PM ET. Six bodies contain `send_enabled`; all six are **lifecycle-emails** (job 11, at :30), with keys `audience`, `canary_count`, `kinds`, `dry_run`, `send_enabled`. Their `send_enabled` is `false` and `dry_run` is `true` — that is `LIFECYCLE_EMAILS_SEND`, **not** `RENEWAL_BASE_SEND`. Zero bodies contain `days_until` or `charge_date` (the renewal dry-run shape).

Today's job 1 run at 7:00:00.299 AM ET (`cron.job_run_details` runid 22267) **succeeded** in 126 ms with return_message "1 row" (that is `cron_call_edge` firing the HTTP call, not the function body). The L1143 deploy receipt this morning already noted that pg_net times out this function after 5 s and does not keep the body. Those morning rows have since aged out of the 12-row window. The same gap remains: **the dry-run field `send_enabled` is not available from the cron log.**

## 2. Live send-renewal-reminders: version, pin, and flag behavior

Live at 8:12 PM ET: **v27**, status ACTIVE, `verify_jwt` false, ezbr `3bcc783c19962ebd2ce0e0e207b37f089a79fca8e729015706010b08c50acf22`, `updated_at` 9:51:33 AM ET Mon Nov 16 2026. Unchanged since the L1143 deploy / L1172 post-check.

Byte match to the L1172 / L1143 pin `1220116b6e50b143864c33116cb31d3030087d85` (confirmed tonight by hashing `git show 1220116b:<path>` against the v27 read-back and against tonight's metadata):

| Live path | sha256 | Pin path in `1220116b` |
|---|---|---|
| source/index.ts | 6979f0da695cb4b211ebfcb6a3146cf1a7e569e871633f9e1e6b5624fa4fb4e0 | supabase/functions/send-renewal-reminders/index.ts |
| source/email.ts | e629702bc8521c8038de71e1caf7c47ee7f0fef8e1a0df92fe16aadf044a1fec | supabase/functions/send-renewal-reminders/email.ts |
| source/logic.ts | 1741f4b7b57074b4c61a3b4b3aa6c516f41f6bd114b06475f628f5fad4518eae | supabase/functions/send-renewal-reminders/logic.ts |
| _shared/email_footer.ts | 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b | supabase/functions/_shared/email_footer.ts |

Line references below are to those live v27 / `1220116b` files (source/index.ts and source/logic.ts).

### Flag: exact-string `"on"` only

`logic.ts:136-137`:

```
/** Fail-safe flag reader (Grant Nov 2 2026): sends are ON only when RENEWAL_BASE_SEND is exactly the lowercase string "on". Unset, "", "ON", "true", "1" are OFF. */
export function sendEnabled(v: string | undefined | null): boolean { return v === "on"; }
```

`index.ts:70-75` (gate sits **before** the send loop, so it applies to Base and sport-branded recipients alike):

```
const sendOn = sendEnabled(Deno.env.get("RENEWAL_BASE_SEND"));
if (dryRun || !sendOn) {
  return json({ success: true, dry_run: true, send_enabled: sendOn, date: now.toISOString(), skipped,
    due: due.map((d) => ({ email: maskEmail(d.email), type: d.type, days_until: d.days_until, charge_date: d.charge_date })) });
}
```

| Flag value | What the function does |
|---|---|
| unset / missing | `sendEnabled` is false. Plan only. Response is `dry_run: true`, `send_enabled: false`. **No** `renewal_reminders` claim, **no** send. |
| `off`, `""`, `ON`, `true`, `1`, or any other string | Same as unset: plan only, no claim, no send, `send_enabled: false`. |
| exact `on` (lowercase) | `send_enabled` is true. If the request also has `?dry_run=1`, it still plans only (`dryRun \|\| !sendOn`). Otherwise it claims and sends (`index.ts:78-107`). The success body then has `results`, not `send_enabled`. |

The live cron command is `select public.cron_call_edge('send-renewal-reminders')` and does not add `?dry_run=1`. So once the secret is exactly `on`, the daily 7:00 AM ET run is a real send.

`index.ts:49` also honors `?dry_run=1` (cron secret still required). This fact sheet did not invoke the function.

### Audience, pack flags, caps, dedupe

- **Audience:** `index.ts:54-56` loads `users` with `base_status = 'active'` and `base_stripe_subscription_id` not null. There is no canary list and no audience secret. `marketing_opt_out` does **not** block these (required account notices; `index.ts:93`).
- **Windows** (`logic.ts:9-13`, `windowFor` at `logic.ts:64-73`): calendar days until the charge date in America/New_York. `2_day` if 0 ≤ daysUntil ≤ 2; `30_day` if 2 < daysUntil ≤ 30; `45_day` if 30 < daysUntil ≤ 45; otherwise not in window. `windowFor` picks the **smallest** window that still covers the days left (catch-up; never two reminders in one run). If the flag is turned on after Tuesday, a member at 44–31 days still gets the 45-day email on that day's run; at 30 days they would get the 30-day email instead.
- **Charge date** (`logic.ts:75-84`): latest future `billing_consents.trial_end` for this Base subscription with `offer <> 'sport'`; else `users.base_expiry` if still in the future.
- **Exclusions**, in this order (`eligible` / `legacyReason`, `logic.ts:86-105`): legacy (`grandfathered_at`, pack tier athlete/coach, pack `subscription_expiry`, pack `stripe_subscription_id`), `base_status` not active, no Base Stripe subscription, canceling (`base_cancel_at_period_end` or `base_canceled_at`), `public.is_test_account(email)`, then internal (email ends with `@romrx.io`, `@romrxbjj.com`, or `@romrxbodybuilding.com`). Test is checked before internal, so an address that is both is counted as `test_fixture`.
- **Pack send flags:** none. There is no separate pack/sport send secret. Legacy pack users are skipped, not sent a Base reminder. Recipients who are eligible are branded by exact `active_sport` `"bjj"` or `"bodybuilding"`, else Base (`email.ts` `brandFor`).
- **Caps:** none. The send loop processes every `due` row. No per-run or per-day limit in this function.
- **Dedupe / claims:** `renewal_reminders` unique on `user_id + reminder_type + subscription_expiry`, inserted **before** the send (`index.ts:80-86`). A unique-violation (23505) is a skip (already sent or claimed). A send failure deletes the claim so a later run can retry (`index.ts:103`). This function does **not** write `email_sends`. Tonight: `renewal_reminders` = **0** rows; `email_sends` rows with `email_id` ilike `%renewal%` = **0**.

## 3. Base renewal emails due at Tue Nov 17 7:00 AM ET

**Window for that run:** charge dates 0 to 45 calendar days after Tue Nov 17, 2026 in America/New_York, split as above. Jan 1, 2027 is exactly 45 days after Nov 17, so it falls in the **45-day** window.

Method: a read-only SQL replica of `index.ts:54-56` + `planReminders` / `eligible` / `chargeAt` / `windowFor` (counts and skip buckets only; no addresses, no user ids in the result, except the two standing exclusion flags below). Cross-checked by running the live v27 `planReminders` and `brandFor` in Deno on anonymized rows (`user@example.com` only; temp file, not in this pack). SQL and Deno agree. Same counts as the L1143 / L1172 due facts this morning.

Run instant used: `2026-11-17T12:00:00.300Z` (Tue 7:00:00.300 AM ET), matching this morning's script and today's actual job 1 start time (7:00:00.299 AM ET).

| Bucket | Count | Brand / notes |
|---|---|---|
| Candidate rows (`base_status=active` and Base Stripe sub present) | 4 | |
| **Due, 45-day** | **1** | Base brand (`active_sport` is not exactly `bjj` or `bodybuilding`). `days_until=45`, charge date 2027-01-01. |
| Due, 30-day | 0 | |
| Due, 2-day | 0 | |
| **Due total** | **1** | Of those, `marketing_opt_out` true: 0 (would still send). Already claimed in `renewal_reminders`: 0. |
| Skipped, `test_fixture` | 2 | Both are also internal; recorded as `test_fixture` because that check runs first. |
| Skipped, `legacy_grandfathered` | 1 | See 7c71e421 below. |
| Skipped, internal-only, canceling, no future charge, not in window, other legacy | 0 | |

Sanity check, same logic at this morning's run (`2026-11-16T12:00:00.300Z`): due total 0; the later-due member was 46 days out (`not_in_window` 1), plus the same 2 test fixtures and 1 grandfathered. Matches job 1 succeeding today with nobody due, and matches L1143.

### Standing exclusions (counts only)

- **7c71e421:** in the candidate query (1 row), **not due** (0). Skip bucket: `legacy_grandfathered`. This is the one grandfathered skip. The account was not written to, only classified.
- **Test / internal:** 2 of the 4 candidates, both skipped as `test_fixture` (they would also have been internal). Neither is in the due set.
- **Fixture 076ce453:** 0 rows in `public.users`, `billing_consents`, or `renewal_reminders`. Not in the candidate set, not due.

If `RENEWAL_BASE_SEND` is exactly `on` at 7:00 AM ET Tue Nov 17, **one** Base member is due the 45-day reminder (From `ROMRx <hello@romrx.io>`, Reply-To `hello@romrx.io`, text `2bf843e3`). If the flag is unset, `off`, or anything other than exact `on`, that run plans only and sends **0**.

## 4. Exact value to set (not done in this step)

- Value: `RENEWAL_BASE_SEND=on` (lowercase `on`; any other spelling stays off).
- Command, once the 7-day token is signed in and Vera's precheck has passed:

```
supabase secrets set RENEWAL_BASE_SEND=on --project-ref cqzvqzwwevnflinxgnpp
```

- Before and after: `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp`, **names only**. Record whether the name `RENEWAL_BASE_SEND` is present in the before list and in the after list. Never print values. Do not set it until the token is in, the pin exists, and Vera's precheck has passed. Grant will say when the token is in.

## 5. Rollback (not done in this step)

The code treats anything other than exact `on` as off. The rollback command is:

```
supabase secrets set RENEWAL_BASE_SEND=off --project-ref cqzvqzwwevnflinxgnpp
```

Then `supabase secrets list` again, names only (the name should still be present). A function invoke to read `send_enabled` back is **not** part of this plan (no invoke). The next cron body is also unlikely to keep `send_enabled` (5 s pg_net timeout; see §1 and open questions). After a rollback, a later daily run should write **no new** `renewal_reminders` row. Rollback cannot unsend an email already claimed and delivered; the claim would already be in `renewal_reminders`.

## 6. Renewal cron job 1 is untouched

Read 8:12:47 PM ET Mon Nov 16. This step did not alter any cron row.

| Check | Live now | Expected |
|---|---|---|
| jobid / name | 1 / `send-renewal-reminders-daily` | same |
| schedule | `0 12 * * *` (7:00 AM ET) | same |
| active | true | true |
| command | `select public.cron_call_edge('send-renewal-reminders')` | same |
| command md5 | `caab15b0a3b771bccfd127f7c3db4df2` | `caab15b0` |
| job 1 row md5 (`jobid\|jobname\|schedule\|command\|active`) | `671b791fa638938d52f643bbcb77547d` | same as L1143 deploy receipt |
| jobs | 13 (jobids 1–13) | 13 |
| overall cron md5 (`jobid\|schedule\|command\|active`, ordered by jobid) | `a96d2036959f1dc2697d23e7665cb490` | `a96d2036` |

The alt fingerprint `62828eff` (described in earlier receipts as "incl. jobname") was **not re-derived** tonight from the live 13-job set, even though the primary `a96d2036` hash matches, which means jobid, schedule, command and active are unchanged for all 13 jobs, including job 1. I am not treating `62828eff` as a failed check; I simply do not have the exact earlier formula.

Job 11 (`lifecycle-emails-hourly`) and every other job were read only and not changed.

## Open questions

1. The live value of `RENEWAL_BASE_SEND` is still unknown until the token sign-in can list names and, separately, a permitted read of whether it equals `on` without printing the value. Grant said the token is not in yet.
2. Post-set confirmation from `net._http_response.send_enabled` is unreliable for this function (5 s timeout and short retention). Safer read-backs after a set: `secrets list` (names only), and after the Tue 7:00 AM ET run a **count** of `renewal_reminders` (expect 1 new `45_day` row if it sent; 0 if still off, or if the send failed and the claim was released). Raising the pg_net timeout would need its own gate line (L1167).
3. L1151's FYI-to-Jim-before-the-flip note is a process item for Grant/Sable, not a facts gap.
4. If the flag is not `on` at 7:00 AM ET Tuesday, the 45-day notice can still catch up on later mornings while days-until is 31–44. From day 30 it would be the 30-day email instead.

## What this pack contains

- This fact sheet.
- `READONLY-QUERIES.sql` — the SELECT statements used tonight (counts, names, and safe http-log fields only).
- `SHA256SUMS`.
- `HELD-BACK-FROM-GIT.md` — nothing held back; this pack has no addresses other than `hello@romrx.io` and `user@example.com`.
