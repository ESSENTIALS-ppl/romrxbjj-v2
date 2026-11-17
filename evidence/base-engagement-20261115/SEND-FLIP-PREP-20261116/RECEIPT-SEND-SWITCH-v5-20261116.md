# SWITCH RECEIPT v5 (PREP / PLAN, NOTHING FLIPPED): P1-34 send switch, Supabase cqzvqzwwevnflinxgnpp

v5 replaces the v4 receipt plan (`RECEIPT-SEND-SWITCH-v4-20261116.md`, sha256 `5abc071f7df65b346479ae4614abd7955a03f14b57c0834911ee478733d35afb`). **v4 is left unchanged.** v1–v3 are also unchanged. Written 9:02 PM ET Mon Nov 16 2026 by Avery's executor. Times in ET. Never write a token, secret value, or a user address here. Allowed addresses in this committed file are only `hello@romrx.io` and the placeholder `user@example.com`.

**Nothing was set, invoked, inserted, updated, scheduled, or emailed while writing this.** The local Bodybuilding pack-sender render (below) stubbed `fetch` and did not call Resend. `email_sends` stayed 24.

## Why v5 exists

Vera marked v4 (`5abc071f`) NOT VERIFIED (`7ab116df`). All customer text in v4 passed. It failed because live data changed: at 8:33:13 PM ET, account `7c71e421` was opted in to retest, protocol, and digest. Its `active_sport` is `bodybuilding`, so lifecycle-emails would send from the Bodybuilding pack sender, which nobody had read.

Source finding (read-only, same turn): those opt-ins were set by **Jim's own session** on the settings screen, via three `POST /rest/v1/rpc/set_reminder_opt_in` calls. Details and log citations are in `SOURCE-FINDING-7c71e421-OPT-INS-20261116.md`. The account was not written, flagged, or edited by this work (L968).

## Ledger quotes

**L968** (2026-11-03 11:44 AM ET). Jim, verbatim as relayed: "No it's my own test account so I can see what's going on." Status (matched for this account only): Jim's own test account, fully untouched (no delete, no `sports_enabled` change, no test flag). L1271 (8:25 PM ET) adds the standing reading that nobody flags it, sets `is_test` on it, or excludes it in code.

**L1228** (2026-11-16 7:55 PM ET). Jim, verbatim, 1:1 with Sable 7:54 PM ET: "I said go so many times 😭". Sable's reading of scope: Jim's go to turn on `LIFECYCLE_EMAILS_SEND` and `ROMBOT_CHECKIN_SEND`. Conditions before either switch flips: Vera reads the live text of every lifecycle and ROMBot check-in email and posts PASS or exact fixes; the flip itself still needs an L881 gate line plus Vera precheck and post-check. Does not cover `RENEWAL_BASE_SEND`.

**L1229** (2026-11-16 7:56 PM ET). Jim, verbatim: "I said go on all 31 things". Conditions that still stand: Vera reads the live text of every customer email before any send switch flips; each push or flip still needs its pinned bytes plus Vera's precheck and post-check under L881.

## Conflict note, and Grant's call (no id exclusion)

Sable asked, in the Grant relay that cited L1228/L1229, to exclude `7c71e421` by id from Step 2 until Vera has read the Bodybuilding pack-sender render. That conflicts with L968 (and L1271): do not exclude this account in code.

**Grant's call, confirmed for v5:** there is **no id exclusion of `7c71e421` anywhere**, neither in code nor in run config. Step 2 **holds entirely** until Vera passes the Bodybuilding pack-sender render file. If she fails that render, Step 2 stays held. This receipt does not add `7c71e421` to a suppress list, does not add it to a canary-exclusion list, and does not change `LIFECYCLE_SUPPRESS_USER_IDS` or any SQL. If Grant later relays Jim's own words allowing a temporary id exclusion, that becomes a v6.

## Approvals and gate

The v4 approvals, exact secret strings, rollback order, "must not change" list, QUICK_CHECK_ON note, and rombot-cron-in-Step-2 plan still stand, except for the live counts and the Step 2 hold in this file. This is still BUILD only. The CLI token name is still `romrx-cli-20261116` (Sable, through GitHub, 8:33 PM ET; cite L1291 / L1296). CLI hosted changes stay held for Jim's line. MCP-only steps are not affected.

## Live counts (re-read at v5 write, 9:02:13 PM ET)

`execute_sql` SELECT only, `2026-11-17 02:02:13.867537+00`:

- `email_sends` = **24**. Newest `sent_at` still Oct 28 2026 12:11:27 PM ET. `lc-%` claims 0. `checkin-d3-email-%` claims 0. `checkin-d3-%` note claims 0.
- Cron: **14** jobs, md5 `0beb8bc4976fc129be2d26c88096c252` (same as v4 `0beb8bc4`). Job 1 command md5 still `caab15b0a3b771bccfd127f7c3db4df2` (`caab15b0`). Untouched.
- Explicit opt-ins in the whole database: retest **1**, protocol **1**, digest **1**. All three are this one account (`7c71e421`). No other opted-in user.
- `base_status = active` users: 17 (fact only; not an exclusion list).
- Canary id file `CANARY-USER-IDS-20261116.txt` (sha256 `567231f04e3bbd58282fce058367b8f75f3471cc3546c5b25b8da21ed56884d1`) is unchanged. None of the 28 UUID lines starts with `7c71e421`. This receipt does not add or remove canary ids.

Compared with v4 (8:26–8:28 PM ET): v4 recorded 0 explicit opt-ins and said this account's markers were null. The only live-data change that drives new expected due counts is this account's 8:33:13 PM ET opt-ins. Cron and `email_sends` are unchanged.

## Step 1 expected values (send flags stay off)

Step 1 shape is still L1269: send flags off, `LIFECYCLE_AUDIENCE=all`, `dry_run=1` counts only, no rombot cron yet, no live data edits. A dry-run **tonight** (9:02 PM ET Mon Nov 16 is outside the 7:00–9:59 AM ET window) selects **0 due emails**. Every kind for this account is `outside_send_window`.

The first in-window dry-run, and the first natural Step 2 send window, is **Tuesday Nov 17, 2026, 7:00–9:59 AM ET**, unless this account logs a Tuesday session or a new assessment first. Local `planKind` on the live candidate (same deployed logic, AUDIENCE=all, no id exclusion) expects:

- **protocol due = 1** (`lc-protocol-2026-11-17`)
- **lapsed due = 1** (`lc-lapsed-2026-10-28`; next-check line "Your retest is ready now.")
- retest due = 0 (latest full assessment is Jul 6 2026, outside the 42–48 day window; older assessments are not swept)
- digest due = 0 (Tuesday is not Sunday)
- check7 due = 0, check14 due = 0 (not on local day 7–8 or day 14)
- ROMBot day-3 notes = 0, ROMBot check-in emails = 0 (not local day 3; no `checkin_d3` note). A Bodybuilding user would also be skipped as `not_base_brand` for the ROMBot email, which uses the Base sender already read in v4.

**Changes vs v4 expected values:** v4, under L1269, expected email opt-ins 0, check7 / check14 Version A eligible 0, day-3 notes 0, **0 due emails**. v5 keeps check7 / check14 Version A eligible 0 and day-3 notes 0, and it updates opt-ins to 1 (this account, all three kinds) and the first in-window due set to **protocol due = 1** and **lapsed due = 1**. The "0 due tonight" figure is only because it is outside the send hour.

## Bodybuilding pack-sender render (no send)

Local Deno, same method as v4: `planKind` + `buildEmail` + `brandFor("bodybuilding")` + `appScore`, fetch stubbed, `handler` / `index` not called, no `--allow-net`. Source tree is the v4 byte-matched copy of deployed lifecycle-emails v4 ezbr `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41` and rombot-checkin v1 ezbr `fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19` (file hashes re-checked this turn, still MATCH).

`email_sends` before the render: **24** at 8:55:58 PM ET. After the render: **24** at 9:00:11 PM ET. Newest still Oct 28 2026 12:11:27 PM ET. Every rendered record has `resend_id: null` and `claimed_email_sends: false`.

This account would actually receive, from the Bodybuilding pack sender `brandFor("bodybuilding")` selects in the deployed `email.ts` (From / Reply-To are in the held-back render file, not repeated here):

- **protocol**, subject `Today is a protocol day`, first due Tue Nov 17 7:00–9:59 AM ET (`lc-protocol-2026-11-17`). The same body would also be due on later plan days at 7:00–9:59 AM ET if no session is logged that day.
- **lapsed**, subject `Your ROMRx plan is still here`, due in that same Tue window (`lc-lapsed-2026-10-28`), with the line "Your retest is ready now." Grace ends after local Nov 20. Note: `lapsedDueOn` uses `auth.last_sign_in_at` (still Nov 3) and does not see tonight's product-event activity.
- **digest**, subject `Your ROMRx week`, first due Sun Nov 22 9:00–11:59 AM ET (`lc-digest-2026-11-22`): app score **84**, no previous-assessment delta, streak 0, sessions this week 0, next-check line "Your next check is today." (`next_check_at` is in the past). Brand score label is "Position Readiness Score".

Retest / check7 / check14 are not due on current data and were not rendered as would-get emails. The live first-name token used in the bodies is `Test`. The recipient address is redacted to `user@example.com`.

Files for Vera (held back from git because they contain the pack-sender address):

- `render-7c71e421-bb-20261116/RENDER-7c71e421-BB-PACK-SENDER-20261116.md` (sha256 filled in SUMS)
- `render-7c71e421-bb-20261116/RENDER-7c71e421-BB-PACK-SENDER-20261116.json` (sha256 filled in SUMS)

## Step 2 (held)

Step 2 — turning `LIFECYCLE_EMAILS_SEND` and `ROMBOT_CHECKIN_SEND` on, and applying the rombot-checkin cron — **runs only after Vera passes the render file above**. If she fails it, Step 2 holds entirely. There is no "Step 2 minus this id" path in this receipt. After a PASS, Step 2 proceeds as in v4 (flags on, audience stays `all`, rombot cron applied, first natural send, Vera reads each first send). The in-window due set above is what the first Tuesday 7:00 AM ET run would select unless the live rows change.

## Rollback and must not change

Same order as v4. Job 1 command md5 must remain `caab15b0`. No force-push, no deletes, no live data edits to `7c71e421`, no Resend, no test submits on live. Fixture `076ce453` stays frozen.

## Held back from git

See `HELD-BACK-FROM-GIT-PREP-v5.md`. The two pack-sender render files are listed in `SHA256SUMS-PREP-v5` and are not committed. v4 held-back files are unchanged.
