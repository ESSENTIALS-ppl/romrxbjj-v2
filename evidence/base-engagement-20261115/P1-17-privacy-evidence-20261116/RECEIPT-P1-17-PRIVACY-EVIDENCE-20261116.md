# RECEIPT: P1-17 privacy evidence (Vera conditions)

Written Mon Nov 16, 2026, 7:14 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp.

**Label:** this is a **local replay** of the deployed ai-chat v96 bytes, plus a **local dry run** of P1-17 at `11803fee`. It is **not** a live capture.

- Live ai-chat request: **NOT TESTED** (rules forbid test submits on live; no new accounts; fixture 076ce453 stays frozen).
- Real Resend send: **NOT TESTED**. Zero Resend fetches on the local mock. No live writes.
- OpenAI: mocked. Supabase: mocked or unused. No env or secret changes. `ROMBOT_CHECKIN_SEND` stayed unset. Account `7c71e421` was not used. No real customer was used. No secrets or live user emails are in this receipt.

Job 1 (staff-list repo file) is recorded at the end, and was done first, with no re-apply.

---

## (a) ai-chat v96 local replay

### Fresh live download (read-only, this turn)

`list_edge_functions` + `get_edge_function` for slug `ai-chat`, project `cqzvqzwwevnflinxgnpp`:

| Field | Live value |
|---|---|
| version | **96** |
| status | ACTIVE |
| verify_jwt | true |
| **ezbr_sha256** | **2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7** |
| files | `source/index.ts`, `_shared/rate_limit.ts`, `source/handler.js` |

File sha256 of the bytes downloaded this turn (and replayed):

| File | sha256 | Bytes |
|---|---|---|
| source/handler.js | **24f61509de9fc132a3da9b558fd13ecfc065455c014716153ba9b96cf0fc4554** | 64944 |
| source/index.ts | 728ea3cc03151e9798a2ef75a2b39098f99dbe86874a78bdd9e9cc6b7ac51f70 | 2799 |
| _shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 | 4896 |

`24f61509…` is the sha256 of **handler.js**, not the function ezbr. The live function ezbr is `2db1a2de…`. Both matched the fresh download. The replayed handler.js hash equals `24f61509…` (**MATCH**). Copies are in `live-ai-chat-v96-fresh/` in this folder.

No blob of `supabase/functions/ai-chat/handler.js` in the romrxbjj-v2 git history hashes to `24f61509…` (31 path commits, 23 unique blobs checked). The live v96 handler is **not** in the repo. `index.ts` and `_shared/rate_limit.ts` do match the copies stored under `/workspace/process/live-ai-chat-v94/` (those two files are unchanged v94 → v96).

get_edge_function does not take a version, so v94 was read from `/workspace/process/live-ai-chat-v94/source/handler.js` (sha256 `ee7b8fdb69d5d57a65f3184c358073d9e52f317c758b9c9399c0491544b86cfa`, 62730 bytes).

### How the replay was run

- Synthetic user only: `aaaaaaaa-aaaa-4aaa-8aaa-000000000001`, email `user@example.com`, name `Alex Example`. Never `7c71e421`.
- Client body as built by romrx-io-web **live 8bf3d601** `app/src/pages/ROMBot.tsx` lines 90–97:

```json
{ "message": "Got it, I'll start today's plan.", "conversation_id": "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", "sport": "base" }
```

The client sends only `message`, `conversation_id`, and `sport`. See `artifacts/client-request-body.json`.

- The local profile was seeded with distinctive markers on age, gender, injury notes, and sessions / session logs, including those fields on the `users` and `rombot_context` rows *and* on mock `sessions` / `session_logs` / `protocol_sessions` tables, so a leak would have shown up in the OpenAI bodies.
- Flags in the replay were **unset** (fail-safe off): `ROMBOT_HISTORY`, `ROMBOT_PACK_DATA`. Live secrets were not read. `ROMBOT_HISTORY` is on only when the env/secret equals `"on"` (`handler.js:9`, `handler.js:833-835`).
- The conversation was a P1-17 check-in thread: one leading assistant note (Branch A in-app words) already in `ai_messages`. The replay is the user's first reply in that thread.
- `handleRequest` from the v96 `handler.js` bytes was used, with `fetch` mocked (OpenAI recorded, Resend blocked). No live HTTP.

### Captured OpenAI calls (secrets redacted)

Both calls happened (1 embeddings, 1 chat/completions). Saved under `artifacts/`.

1. **Embeddings** (`handler.js:684-706`, call at `handler.js:1110`): `POST https://api.openai.com/v1/embeddings`

```json
{ "model": "text-embedding-ada-002", "input": "Got it, I'll start today's plan." }
```

Input is the current user message only (first 1000 characters). No profile fields, no history, no sessions.

2. **chat/completions** (`handler.js:708-735`, call at `handler.js:1129`): `POST https://api.openai.com/v1/chat/completions`

- model `gpt-6-luna`, `max_completion_tokens` 800, `reasoning_effort` `"none"`, `store: false`
- messages: one `system` (the CBase prompt + a "Relevant Research" knowledge chunk from `search_rombot_knowledge`) and one `user` (`Got it, I'll start today's plan.`).
- Authorization header redacted in the saved JSON.

The leading check-in assistant note was loaded from `ai_messages` and then **dropped** by `loadRecentHistory` (`handler.js:773-784`: "drops a leading assistant row so the history starts with a user turn"). So the check-in note text was **not** in the completions body. Observed: `checkin_note_present_in_completions_body: false`.

### Marker grep (expect 0) — all 0

| Marker | Seeded as | Hits in embeddings + completions bodies |
|---|---|---|
| `AGE_MARKER_ZXQ94_AGE_47` | age / age_bucket | **0** |
| `GENDER_MARKER_ZXQ94_NONBINARY` | gender / sex | **0** |
| `INJURY_NOTE_MARKER_ZXQ94_LEFT_KNEE_ACL` | injury_notes, injury flags, joint notes, protocol user_note, plan description | **0** |
| `SESSION_LOG_MARKER_ZXQ94_SET_COUNT_999` | session_logs / protocol_sessions rows | **0** |
| `SESSION_MARKER_ZXQ94_DURATION_777` | sessions row | **0** |

Tables actually queried in the replay: `users`, `rombot_context`, `ai_conversations`, `ai_messages`. **No** `sessions`, `session_logs`, or `protocol_sessions` query.

### Allow-list (v96), with file:line, vs v94

**CONTEXT_SELECT** (v96 `handler.js:191-192`; v94 `handler.js:178-179`) — **MATCH**, identical string:

`user_id, full_name, latest_assessment_id, rom_total, worst_joints, joint_scores, technique_summary, red_techniques, green_techniques, yellow_techniques, protocol, saved_game_plans`

**allowListContext** (v96 `handler.js:199-221`; v94 `handler.js:186` and following) — **MATCH**, identical function. It keeps:

- `full_name`, `latest_assessment_id`, `rom_total`
- `worst_joints` (as strings)
- `joint_scores`: `joint_key`, `joint`, `key`, `score`, `left`, `right`, `left_value`, `right_value`, `value` only
- `technique_summary`: `green`, `yellow`, `red`
- `green_techniques` / `yellow_techniques` / `red_techniques`: `name`, `category`, `limiting_joints`
- `protocol`: `joint`, `jointKey`, `joint_key`, `exercise`, `sets`, `reps`, `cue`, `coaching_cue`
- `saved_game_plans`: `name`, `path_mode`, and technique `name`s
- `assessment_history` only if it is already a string (filled later, flag-gated)

Comment at v96 `handler.js:187` (v94 `handler.js:174`): **NEVER: age, gender, injury or free-text notes**, email, billing / subscription, belt, platforms, red-flag reasons, dates of birth.

Other selects (v96):

| Table | Columns | Lines |
|---|---|---|
| `users` | `portal_role, full_name, active_sport, sports_enabled` | `handler.js:983` |
| `rombot_context` | `CONTEXT_SELECT` | `handler.js:1019-1032` |
| `assessments` (only if `ROMBOT_HISTORY === "on"` and Base) | `id, assessed_at, rom_total, joint_scores(joint_key, score, left_value, right_value)` | `handler.js:1037-1040` |
| `ai_messages` (history) | `role, content` | `handler.js:775-776` |
| `ai_conversations` (ownership / insert) | `id` / insert of `user_id, sport, provider, model, context_snapshot: {}` | `handler.js:915`, `1080-1087` |
| `coaches` / `athletes` | coach roster path only (not used in this Base replay) | `handler.js:1001-1008` |

**Sessions or session logs:** not selected, not queried, not present in the OpenAI bodies. **Measurements** in the sense of protocol session / capture logs: not included. **Joint measurement degrees** from `joint_scores` *are* included (see below).

### Context fields one-by-one vs privacy section 3

Live section 3 sentence (Stacy v3, Edit 2 struck, live text restored): "(such as your first and last name, readiness levels, focus areas, and plan)". Source: `/workspace/process/evidence/STACY-P1-17-PRIVACY-LINE-v3-20261116-1906.md` (sha256 `f1b1a805…`).

What the **Base** v96 system prompt actually contained in this replay (CBase, `handler.js:357-414`):

| # | Field sent to OpenAI | Source | Section 3 match? |
|---|---|---|---|
| 1 | Name (`Alex Example`) | `rombot_context.full_name` | **Yes** — "first and last name" |
| 2 | Overall mobility band (`Needs focus`) and per-joint bands (Needs focus / Building / Steady) | `joint_scores.score` via `formatMobilityBands` / `overallBandFromJointScores` | **Yes** — "readiness levels" |
| 3 | Top three problem areas + "Start here" joint | `worst_joints` + scores | **Yes** — "focus areas" |
| 4 | Priority mobility protocol (exercise, sets, reps, cue) | `protocol` | **Yes** — "plan" |
| 5 | Saved game plan name, path mode, technique names | `saved_game_plans` | **Yes, arguably** — "plan" (Stacy also named saved game plans when she read v94) |
| 6 | Raw measured degrees (left/right) and overall ROM score `/100` | `joint_scores.left_value/right_value`, `rom_total` via `formatMeasurements` (`handler.js:135`, used at `handler.js:403-404`) | **Not named.** Section 3 says "readiness levels," not "measured numbers," "degrees," or "overall ROM score." Stacy's v94 reading did list `joint_scores` and `rom_total`. |
| 7 | Current user message | client `message` | Chat content; not in the "such as" list (it is the chat itself) |
| 8 | "Relevant Research" knowledge chunk | `search_rombot_knowledge` after the embeddings call | Not personal data |
| 9 | Sport label `BASE` | client `sport` + profile | Not a listed personal field |

Loaded by the allow-list but **not** present in this Base system prompt:

- `technique_summary` and green/yellow/red technique lists — used in **CSport**, not CBase. Loaded, not forwarded in this Base replay.
- `latest_assessment_id` — kept by `allowListContext`, not printed in the prompt.
- Earlier assessment history — **not loaded**, because `ROMBOT_HISTORY` was unset. If it were `"on"`, v96 would also send earlier `assessed_at` dates, `rom_total`, and joint degrees/scores (`handler.js:1037-1040`, `formatAssessmentHistory` at `handler.js:793`, inserted at `handler.js:408-411`). That would add assessment dates, which the section 3 sentence does not name. Live secret value was not read.

**Does the live section 3 sentence accurately cover everything v96 sends?** It covers name, readiness bands, focus areas, and plan, and the "such as" wording is not a closed list. The one user-data item it does **not** name, and that this replay did send, is the **raw measurement block** (joint degrees and overall ROM score /100). Recent chat: only the current user message went up in this first-reply-in-a-check-in-thread case, because the leading assistant note was stripped.

v94 vs v96 allow-list and CONTEXT_SELECT: **MATCH**.

---

## (b) Cron: `ai-chat-retention-90d-daily` / `purge_ai_chats_90d`

Read-only `cron.job` and `cron.job_run_details`. No writes.

There is **no** cron job whose *name* is `purge_ai_chats_90d`. The scheduled job is:

| Field | Value |
|---|---|
| jobid | **10** |
| jobname | **ai-chat-retention-90d-daily** |
| schedule | `17 8 * * *` (08:17 UTC = 3:17 AM ET) |
| active | **true** |
| command | `select public.purge_ai_chats_90d()` |
| command md5 | `1760ebc6aa9483d0d329e563df706858` |

So `purge_ai_chats_90d` is the **function** the job runs, not a second job.

Last 3 runs of jobid 10 (times in ET, America/New_York):

| runid | start (ET) | end (ET) | status | return_message |
|---|---|---|---|---|
| 22256 | Mon Nov 16, 2026, 3:17:00.322 AM ET | 3:17:00.365 AM ET | succeeded | 1 row |
| 22199 | Sun Nov 15, 2026, 3:17:00.150 AM ET | 3:17:00.193 AM ET | succeeded | 1 row |
| 22148 | Sat Nov 14, 2026, 3:17:00.102 AM ET | 3:17:00.150 AM ET | succeeded | 1 row |

---

## (c) P1-17 dry run at `11803fee`

Ran the exact tree at `11803fee4157f23435d0b97e6aaa08eddb020565` (worktree `/workspace/p1-17-wt`, HEAD is that commit). `ROMBOT_CHECKIN_SEND` **unset** (dry). `LIFECYCLE_EMAILS_SEND` unset. Synthetic fixture only: user_id `11111111-1111-4111-8111-111111111111`, email `user@example.com`, name Sam Lee. Never `7c71e421`.

`handle()` was invoked twice, both dry:

1. **Note phase** — Mon Nov 16, 2026, 7:30 AM ET (day 3, 0 sessions → Branch A).
2. **Email phase** — Tue Nov 17, 2026, 8:30 AM ET (25 hours after the note; no activity since). A note and its email never go in the same run.

Both responses had `dry_run: true`, `send_enabled: false`. `claim`, `insertNote`, and `send` were each called **0** times. Global `fetch` recorded **0** calls to `api.resend.com` (and no other fetches).

Because dry mode returns only a short plan (not the full row or MIME payload), the would-write note row and the would-build Resend body were produced from the **same** `plan()` / `planEmails()` objects that `handle()` used, via `noteFor()` and `buildCheckinEmail()`, and shaped as `index.ts` lines 129–132 would POST to Resend. Those builders were called locally; `send()` / `fetch` were not. This is not a live send and not a deploy.

### In-app note row it would write

See `artifacts/p1-17-would-write-note-row.json`. Message content:

> Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
> If something got in the way, tell me here and I'll help you find an easier way in.

Vera's four allowed contents, as present:

| Allowed field | Present in this Branch A note? |
|---|---|
| first name | **Yes** — Sam |
| session count | **No** (Branch A is 0 sessions; the count is used in B and C) |
| focus area | **Yes** — hips |
| next check date | **No** (Branch C only) |

**Flagged extras** (not in that four-field list):

- "It's been 3 days since your assessment"
- "your plan is ready" / "It's short, and you can do it now. Want to start?"
- last line "tell me here…" (in-app BRANCH_COPY; email wording is different)
- `context_snapshot.kind=checkin_d3`, `branch=A`, `assessment_id`, and `button` `{ label: "Start today's session", path: "/dashboard/my-protocol?src=checkin-d3" }`
- `conversation.sport=base`, `provider=rombot` (no title, intentional)

### Resend payload it would build (nothing sent)

See `artifacts/p1-17-would-build-resend-payload.json`.

- **From:** `ROMRx <hello@romrx.io>`
- **Reply-To / reply_to:** `hello@romrx.io`
- **To:** `["user@example.com"]`
- **Subject:** `Your plan is ready, Sam`
- Body line 1: `Hey Sam, ROMBot here. Your plan is ready whenever you are. Today's focus is your shoulders. It's short, and you can do it now. Want to start?`
- Button: `Start today's session`
- Last line: `If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.`

This **matches** Stacy's words file `/workspace/process/evidence/STACY-P1-17-CLIENT-WORDS-20261116-0958.md`, sha256 `9d8fe2910ea9708ffbc5b6170ef593eb679c64d82d6ace5c67e6a06314f4e801`, item 3 (Branch A email body + subject), filled with `first_name=Sam` and `{today_area}` on the **email send day**. Tuesday's area is shoulders (`ROTATION[2] = 1` → `shoulder_flex`); the Monday note said hips. That is the 9d8fe291 rule: work out `{today_area}` on the send day, do not copy it from the note.

Item 4 (B/C last lines only) was not exercised in this Branch A fixture.

### User fields that reach Resend (Branch A)

- email (`user@example.com`) — `to` and footer "This message was sent to …"
- first name (`Sam`) — subject and line 1
- today's focus area (`shoulders`) — line 1
- not present: session count, next check date, age, gender, injury notes, scores, degrees, session log rows

Unsubscribe links were minted with a **local test secret** only (`"s" × 40`, the existing test fixture). Live secrets were not read. Those tokens are not production values.

### Proof nothing was sent

| Check | Result |
|---|---|
| Resend fetches recorded by the mock | **0** |
| Local `email_sends` count before dry runs | **0** |
| Local `email_sends` count after dry runs | **0** (delta 0) |
| `claim` / `insertNote` / `send` calls | **0 / 0 / 0** |
| Live `public.email_sends` (read-only, no user ids or emails) before | total **24**, rows with `sent_at` since Mon Nov 16, 2026, 7:00 PM ET: **0**, `email_id` like `checkin-d3%`: **0**, newest `sent_at` Wed Oct 28, 2026, 12:11:27 PM ET |
| Live `public.email_sends` after (same query) | **same**: total 24, since 7:00 PM ET 0, checkin-d3 0, newest still Oct 28, 2026, 12:11:27 PM ET |

---

## Job 1 (done first, no re-apply)

Repo-only: added the already-applied L1170 SQL as `supabase/migrations/20261117000045_p1_22_staff_list.sql` on branch `chore/l1170-staff-list-repo-file-20261117` off `origin/main`.

| Item | Value |
|---|---|
| Commit | `def336844e6b4683303ddf8b7a8f580ab1ad31c5` |
| File sha256 | `b152a965d8b283d3abc5280b0e85e18e6d0096e4a9e77719df3ff2b99f949a14` |
| Byte-match to pinned applied SQL | **Yes** (703 bytes, trailing newline included) |
| Live `supabase_migrations.schema_migrations` version `20261117000045` statement sha256 | `b152a965d8b283d3abc5280b0e85e18e6d0096e4a9e77719df3ff2b99f949a14` (1 statement, 703 chars) |
| Live-statement match | **Yes** |
| Push | plain push of that branch only; `origin/main` unchanged |
| Re-apply / Supabase writes | **None** |

---

## Artifacts

- `artifacts/client-request-body.json`
- `artifacts/openai-embeddings-request.json`
- `artifacts/openai-chat-completions-request.json`
- `artifacts/replay-summary.json`
- `artifacts/p1-17-would-write-note-row.json`
- `artifacts/p1-17-would-build-resend-payload.json`
- `artifacts/p1-17-dry-run-summary.json`
- `live-ai-chat-v96-fresh/` (the replayed bytes + META)

SHA256SUMS in this folder lists these files (added, not an overwrite of `/workspace/SHA256SUMS`).
