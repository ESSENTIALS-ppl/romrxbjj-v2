# RECEIPT v3: P1-17 privacy evidence, seed-row dump and marker absence

Written Mon Nov 16, 2026, 7:27 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp.

This addendum sits on top of receipt v2 (`RECEIPT-P1-17-PRIVACY-EVIDENCE-v2-20261116.md`, sha256 `22138cf1c7a8bb3af9a066acf0000aa3247010b3d596a10bfa04d54ef3b10740`). It does not replace v1 (`RECEIPT-P1-17-PRIVACY-EVIDENCE-20261116.md`, sha256 `b9472441e1f1bcbb7a6b5ad520f75decb3686692378e64d426933cfa5c2b1fd3`) or v2. Those files, `SHA256SUMS`, and `SHA256SUMS-v2` were left untouched.

It answers Vera's WARN on the v1 check (`/workspace/vera-verdicts/vera-P1-17-privacy-evidence-b9472441-check-20261116.md`, sha8 `7e9c270e`): the seeded age, gender, injury and session markers were named in the receipt but not shown. This file adds the seed-row dump and a marker-absence check with a positive control.

**Label:** local replay of the exact live ai-chat v96 handler.js bytes (`24f61509…`) and local dry run of the exact rombot-checkin bytes at `11803fee4157f23435d0b97e6aaa08eddb020565`. Not a live capture. Live ai-chat request: **NOT TESTED**. Real Resend send: **NOT TESTED**.

- `ROMBOT_CHECKIN_SEND` stayed unset (dry). `LIFECYCLE_EMAILS_SEND` unset. No env or secret changes, no deploy, no live writes.
- Synthetic accounts only, email `user@example.com`. Account `7c71e421` was not used. Fixture `076ce453` was not used. No real customer was used.
- Test data only in the dump. Emails are `user@example.com` (and, in already-hashed Resend payloads, `hello@romrx.io` as From / Reply-To).

---

## Hash confirmation before the rerun

Recorded Mon Nov 16, 2026, 7:26:02 PM ET, before any replay or dry run in this v3 pass.

| Check | Result |
|---|---|
| `live-ai-chat-v96-fresh/source/handler.js` sha256 | `24f61509de9fc132a3da9b558fd13ecfc065455c014716153ba9b96cf0fc4554` (**MATCH**) |
| Live ai-chat v96 ezbr (from receipt v1; not re-downloaded this pass) | `2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7` |
| `/workspace/p1-17-wt` HEAD | `11803fee4157f23435d0b97e6aaa08eddb020565` (**MATCH**) |
| `/workspace/p1-17-wt` working tree | clean; on-disk blobs of handler.ts, email.ts, logic.ts, copy.ts, email_footer.ts, unsub_token.ts, and test/fixtures.ts match `11803fee` |
| `ROMBOT_CHECKIN_SEND` | unset |

The rerun scripts were copies of the v1/v2 harnesses with only the output directory retargeted to `/tmp/p1-17-privacy-evidence-v3/`, so existing hashed artifacts were not overwritten.

---

## Rerun (same bytes)

| Step | Time (ET) | Result |
|---|---|---|
| ai-chat v96 local replay (`node scripts/replay-ai-chat-v96.mjs`) | 7:26:07 PM ET | ok, HTTP 200, 1 embeddings, 1 completions, 0 Resend, handler sha `24f61509…`, all marker hits in OpenAI bodies 0 |
| 11803fee v1 dry run (Branch A; `deno run --no-lock --node-modules-dir=none`, type-checked, no `--no-check`) | 7:26:10 PM ET | ok, both phases `dry_run: true`, 0 claims / insertNote / send, 0 Resend fetches, local `email_sends` delta 0 |
| 11803fee branches A, B (n=1, n=2), C (n=3) dry run (same deno flags) | 7:26:14 PM ET | ok, all four cases both phases dry, 0 writes, 0 Resend fetches, local `email_sends` delta 0 |

All **16/16** rerun artifact files were byte-identical to the already-hashed copies in this folder (0 mismatches). No new capture files were added. `SHA256SUMS` and `SHA256SUMS-v2` still check clean.

---

## Seed-row dump

Path: `artifacts/p1-17-v3-seed-rows.json`

sha256: `f5f49885dd686db9bf1e18b496b503dfd3f6f1b5d705952329f1a5f5df2cf97c`

The dump has two sections.

### 1. ai-chat v96 replay (this is where the ZXQ94 markers were seeded)

Exact local mock rows from `replay-ai-chat-v96.mjs`. The mock returns the full row, including marker fields, even when the handler selects a narrower column list, so a leak of the raw object would have shown up in the OpenAI bodies.

Synthetic user `aaaaaaaa-aaaa-4aaa-8aaa-000000000001`, email `user@example.com`, name Alex Example.

| Row | Field | Value |
|---|---|---|
| `users` | `age`, `age_bucket` | `AGE_MARKER_ZXQ94_AGE_47` |
| `users` | `gender`, `sex` | `GENDER_MARKER_ZXQ94_NONBINARY` |
| `users` | `injury_notes`, `injury_flags[0]`, `notes` | `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` |
| `rombot_context` | `age` | `AGE_MARKER_ZXQ94_AGE_47` |
| `rombot_context` | `gender` | `GENDER_MARKER_ZXQ94_NONBINARY` |
| `rombot_context` | `injury_notes` | `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` |
| `rombot_context` | `joint_scores[0].notes`, `joint_scores[0].injury` (hip_ir) | `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` |
| `rombot_context` | `protocol[0].user_note` | `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` |
| `rombot_context` | `saved_game_plans[0].description` | `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` |
| `sessions[0]` | `duration` | `SESSION_MARKER_ZXQ94_DURATION_777` |
| `sessions[0]` | `notes` | `SESSION_LOG_MARKER_ZXQ94_SET_COUNT_999` |
| `sessions[0]` | `logged_at` | `2026-11-15T15:00:00Z` |
| `session_logs[0]` and `protocol_sessions[0]` (same mock row) | `body`, `set_count` | `SESSION_LOG_MARKER_ZXQ94_SET_COUNT_999` |

The leading `ai_messages` check-in note was also seeded (Branch A in-app words). It does not contain any marker. Full rows, including non-marker fields (ROM scores, joint degrees, protocol, techniques), are in the JSON dump.

### 2. 11803fee A, B, and C fixtures

Exact `Candidate` objects the dry run passed to `handle()` / `plan()`, built by `cand()` in `test/fixtures.ts` plus the per-case overrides in `dry-run-p1-17-branches-bc.ts`. All four: name Sam Lee, email `user@example.com`, Base, assessed Fri Nov 13, 2026, 9:00 AM ET, reminder 07:00 ET, `next_check_at` `2026-11-20T14:00:00Z`, `is_test` false.

`Candidate` (`logic.ts` lines 114–141) has **no** `age`, `age_bucket`, `gender`, `sex`, or `injury_notes` fields. Those keys were not passed to `cand()` and were not present on the object the dry run used. The dump lists them as null under `profile` so the question is answered directly, and records that the ZXQ94 markers were **not** seeded on these fixtures.

Session data on these fixtures is `sessions_since`: `protocol_sessions.logged_at` timestamps at or after the assessment. There were no duration / notes / body / set_count columns and no ZXQ94 markers on these session lists.

| Case | user_id | Profile age / gender / injury notes | Session rows (`logged_at`) | Markers on this fixture |
|---|---|---|---|---|
| A, n=0 | `11111111-1111-4111-8111-111111111111` | not seeded (not a Candidate field) | none | **none** |
| B, n=1 | `22222222-2222-4222-8222-222222222221` | not seeded | `2026-11-14T18:00:00Z` | **none** |
| B, n=2 | `22222222-2222-4222-8222-222222222222` | not seeded | `2026-11-14T18:00:00Z`, `2026-11-15T18:00:00Z` | **none** |
| C, n=3 | `33333333-3333-4333-8333-333333333333` | not seeded | `2026-11-14T15:00:00Z`, `2026-11-15T15:00:00Z`, `2026-11-15T20:00:00Z` | **none** |

The email-phase candidate for each case is the same object plus `note` (`assessment_id`, `branch`, `at` `2026-11-16T12:30:05Z`), `email_already: false`, and `last_any_assessment_at` `2026-11-13T14:00:00Z`.

---

## Marker-absence check

Paths:

- `artifacts/p1-17-v3-marker-absence.json` — sha256 `2f4e431d7fa04e1a4712397c9ef6c4cf8ded27f90f78796aca822aa9eac45d71`
- `artifacts/p1-17-v3-marker-absence-grep.txt` — sha256 `0aa351dea64eff81ea09cac5e69ac000152d37ac123fd7847ebe4fdef376b92a` (raw `grep -F -o MARKER FILE \| wc -l` occurrence counts)

Method: fixed-string occurrence count (`grep -F -o`, cross-checked with Python `str.count`). Counts are occurrences, not lines. If any marker had appeared in any output artifact, this receipt would not have been written as a PASS.

### Outputs (expect 0) — all 0

| Artifact | age | gender | injury_notes | session_log | session |
|---|---:|---:|---:|---:|---:|
| `openai-chat-completions-request.json` | 0 | 0 | 0 | 0 | 0 |
| `openai-embeddings-request.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-would-write-note-row.json` (v1 A) | 0 | 0 | 0 | 0 | 0 |
| `p1-17-would-build-resend-payload.json` (v1 A) | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-A_n0-note-row.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-A_n0-resend-payload.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-B_n1-note-row.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-B_n1-resend-payload.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-B_n2-note-row.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-B_n2-resend-payload.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-C_n3-note-row.json` | 0 | 0 | 0 | 0 | 0 |
| `p1-17-v2-C_n3-resend-payload.json` | 0 | 0 | 0 | 0 | 0 |

### Positive control (expect >0) — the grep works

The same grep against `artifacts/p1-17-v3-seed-rows.json`:

| Marker | Hits in seed dump | Of those, in the ai-chat seed section | In the A/B/C fixture section |
|---|---:|---:|---:|
| `AGE_MARKER_ZXQ94_AGE_47` | **7** | 6 | 0 |
| `GENDER_MARKER_ZXQ94_NONBINARY` | **7** | 6 | 0 |
| `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` | **17** | 16 | 0 |
| `SESSION_LOG_MARKER_ZXQ94_SET_COUNT_999` | **11** | 10 | 0 |
| `SESSION_MARKER_ZXQ94_DURATION_777` | **3** | 2 | 0 |

Every marker appears in the seed dump (so a leak would have been visible). The leftover counts above the ai-chat section are the top-level `markers` dictionary in the dump. The A/B/C fixture objects contain none of the markers, which matches how those fixtures were seeded.

**PASS:** 0 hits per marker in every captured OpenAI request body, note row, and mocked Resend payload; every marker appears in the seed-row dump.

---

## Artifacts added in this v3 (SHA256SUMS and SHA256SUMS-v2 were not modified)

- `RECEIPT-P1-17-PRIVACY-EVIDENCE-v3-20261116.md` (this file)
- `SHA256SUMS-v3`
- `artifacts/p1-17-v3-seed-rows.json`
- `artifacts/p1-17-v3-marker-absence.json`
- `artifacts/p1-17-v3-marker-absence-grep.txt`
