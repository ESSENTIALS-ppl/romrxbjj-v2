# RECEIPT: P1-25 purge v2 — backup retention and Stacy line check, 2026-11-16 7:24 PM ET (Avery)

READ-ONLY. No writes to live, no setting changes, no apply_migration, no deploy, no cron, no emails. The original receipt `RECEIPT-P1-25-PURGE-20261116.md` (sha256 starts with **5c8ee929**) and `SHA256SUMS` (starts with **5d6093bb**) were not edited. This file is additive, with `SHA256SUMS-v2`.

Commit under review: romrxbjj-v2 **1607d0c3d2ec4208d358449ed785b7334bc62f85** (BUILD ONLY, unapplied). Function SQL bytes in this folder and in the worktree at that commit both hash **de9996d717ab4aafc030cf91d0e4eb9e1dabd458d8272588b36c83a50e447552**. Line cites below are to `20261117010000_p1_25_purge_deleted_accounts.sql` at that commit.

Stacy's line: `/workspace/process/evidence/STACY-P1-25-PURGE-PRIVACY-LINE-20261116-1918.md`, sha256 **b07f05e129c3f9de7d8651307a10fd5ceb476fdcb852fb18000a14dd9219801c** (starts with **b07f05e1**, MATCH — this check proceeds).

---

## 1. Backup retention for project cqzvqzwwevnflinxgnpp

### What the MCP read tools returned

- `get_organization` on org `chytcvuxbohgnvoxobsj` (name ROMRx): **plan `free`, tier `tier_free`**, `opt_in_tags` empty. This is the only MCP tool that returned a plan field.
- `get_project` on `cqzvqzwwevnflinxgnpp` (name romrxbjj-v2): region `us-east-1`, status `ACTIVE_HEALTHY`, Postgres `17.6.1.111`, org id as above, created 2026-04-27 1:07:04 PM ET (source timestamp `2026-04-27T17:07:04.883326Z`). **Did not return a plan, daily-backup retention, PITR on/off flag, or PITR window.**
- `list_projects` / `list_organizations`: project and org metadata only; no plan or backup fields on the list result. A second project in the same org, `uckqrgaetobpiofdbhny` (ROMRxBJJ), is `INACTIVE`.
- **No `list_backups` (or equivalent) tool is installed** in the user-Supabase MCP namespace. The project's actual backup list, restore points, and PITR enablement could not be read from MCP.

### Official docs for this plan's retention (WebFetch)

- https://supabase.com/docs/guides/platform/backups — "We automatically back up all Pro, Team, and Enterprise Plan projects on a daily basis." Retention: Pro last 7 days of daily backups; Team last 14 days; Enterprise up to 30 days of daily backups. "We recommend that free tier plan projects regularly export their data using the Supabase CLI `db dump` command and maintain off-site backups." PITR is an add-on for Pro, Team, and Enterprise. If PITR is enabled, daily backups stop. Self-serve PITR recovery windows in the same page's pricing table: 7, 14, or 28 days. Database backups do not include Storage API objects.
- https://supabase.com/pricing — organization-based billing. Free plan write-up does not list daily backups. Pro lists "Daily backups stored for 7 days" and "7-day log retention." Team lists "Daily backups stored for 14 days" and "28-day log retention."
- https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery — PITR is an add-on; published recovery retention periods are 7, 14, or 28 days. Examples are billed against a Pro Plan.

### Stated plainly

- **Plan (from MCP):** Free (`tier_free`) at the organization, per `get_organization`. `get_project` itself did not confirm the plan.
- **Official daily backup retention for Free:** automatic daily backups are **not included**. Official paid-plan windows, if the dashboard ever differed from this MCP read, are 7 / 14 / up to 30 days — still under 90 days.
- **PITR:** on/off and window were **not returned** by `get_project` or `get_organization`. Official docs do not include PITR on the Free plan (add-on for Pro, Team, and Enterprise only). Published PITR windows are 7, 14, or 28 days, all under 90 days. Whether this project somehow has PITR enabled is **unknown** from the installed tools.
- **Does any backup outlast 90 days?** Official published Supabase-managed daily backups and PITR windows do **not** last more than 90 days, on any plan documented in the pages above. On the Free plan returned here, official automatic daily backups are not included, so there is no official managed daily backup of this project that lasts 90 days. **Unknown:** any manual or off-site `db dump` the team may have kept (the Free-plan recommendation); the project's actual backup inventory (no list-backups tool); whether a custom Enterprise arrangement exists (MCP returned Free, not Enterprise). After a future apply-mode run, the function's own in-database schema `zz_bak_p1_25_*` is kept until someone drops it (see `BACKUP-AND-ROLLBACK.md`) and **can** outlast 90 days; that is not a Supabase platform backup, and none exists yet because the function is unapplied.

---

## 2. Match of 1607d0c3 against Stacy's line

Stacy's public words (section 4 replacement): erase leftover deleted-account data 90 days after the deletion is **completed**; keep only two kinds of records after that — billing terms (`billing_consents`) and consents given or withdrawn, such as reminder opt-ins (`consent_events`). Notes: clock starts at completion, not request; open requests are not purged; 30-day manual process unchanged; billing/consent rows have no end date in the code; Stripe keeps its own payment records; a backup line is needed if backups last longer than 90 days.

### What matches

- Qualifier path (a): `account_deletion_requests.status = 'completed'` and `completed_at < now() - retention` (header L18; SQL L91–L95). Default and minimum retention are 90 days (L38, L64–L70). A request still `requested` or `in_progress` is not qualified (header L20–L21).
- `billing_consents` and `consent_events` are leave-alone: not copied, not deleted (header L27; inventory comment L162–L163; guard L313–L314).
- The 30-day manual completion process is not changed by this file (header L13–L17).
- The function does not touch Stripe-side objects (no Stripe API calls in the file). Stacy already flags that Stripe keeps its own payment records.

### Match result: PARTIAL — the completed-ADR clock and the two leave-alone tables match; several other behaviors do not match the public sentence "permanently erased" / "we keep only two kinds of records after that."

### Mismatches (flagged)

1. **Second qualifier, path (b).** The function also qualifies an account when `auth.users.deleted_at` is not null and older than retention, even with no completed ADR (header L18–L19; SQL L97–L100; function comment L546–L547). Stacy's words start the clock only when "the deletion is completed." The file comments that `deleted_at` is unused today (0 rows at the earlier live read). The path is still in the code.
2. **In-database apply backup `zz_bak_p1_25_*`.** In `apply` mode the function creates schema `zz_bak_p1_25_YYYYMMDDHHMMSS` (L331–L346), copies qualifying inventory rows (including `auth.users`) and matching `storage.objects` into it (L348–L428), then deletes. The backup schema is kept; dropping it needs a separate yes (`BACKUP-AND-ROLLBACK.md`). That is leftover deleted-account data after the 90-day purge, including data the public line says is "permanently erased." It can outlast 90 days.
3. **Third explicit leave-alone: `ops.internal_accounts`.** Same leave-alone list as the two consent tables (L27, L162–L163, L313–L314). The table itself is never copied or deleted. Staff ids in it are also hard-excluded from the qualifying set (L22–L23, L117, L137).
4. **Hard exclusions, even with a completed ADR older than 90 days:** `7c71e421-929b-4691-a6bc-cc614ed2a08d` (L22, L43, L116), every `ops.internal_accounts.user_id` (L117), and test fixtures (`raw_app_meta_data.test_fixture = true`, or `public.is_test_account` when it exists) (L24–L25, L118–L129). Their leftover data is not purged.
5. **"Keep only two kinds" is not complete.** Everything listed in section 3 below is also left in place. The largest customer-data gaps versus the public sentence are: unattributable SET NULL leftovers; `leads` and `schools` rows (ids nulled, rows kept); athlete-side coach-tool rows with no FK; auth audit / flow_state / scim leftovers; unmatched storage objects; platform logs; Stripe; and the apply backup schema. Pre-account email lists (`leads` itself, `sport_pack_waitlist`, `yoga_testers`, `investor_requests`, `partner_inquiries`) are not keyed by `user_id` in a way this function purges and therefore remain.
6. **`public.consents` and `public.user_ads_consent` are not leave-alones.** Both have `ON DELETE CASCADE` to `auth.users` (live catalog, 2026-11-16). They are not in `_rels` and not in the leave-alone list. If the auth row is still present, deleting `auth.users` (L515–L520) removes them. If the 30-day step already deleted the auth row, they are already gone. They are not among the two record kinds the policy line says are kept; ads consent and signed terms/waiver (`signed_name`) are not preserved by this function.
7. **Backup-policy line.** Official managed backups, on the plan and docs above, do not last 90 days, so Stacy's "add a backup line if backups last longer than 90 days" is not triggered by official daily/PITR windows. It **is** triggered by the function's own `zz_bak_p1_25_*` schema after an apply-mode run, and it remains unknown for any off-site dumps.

The `account_deletion_requests` row is **not** left in place for a qualifying id: it is in the inventory (L176) and is deleted when `user_id` still matches (delete loop L430–L449). There is no live FK from that table to `auth.users`, so the row survives a prior auth-user delete and is then removed by this function.

---

## 3. Everything else the function leaves in place (with file:line)

Leave-alone by design (not in `_rels`, guarded at L313–L314):

- `public.billing_consents` — L27, L162–L163, L313–L314. No FK (live catalog). `user_id` and Stripe ids stay on the row. No end date in this code (matches Stacy's note).
- `public.consent_events` — same lines. Live FK is `ON DELETE SET NULL` to `auth.users`. The function never deletes the row; a later (or this run's) `auth.users` delete nulls `user_id`. No end date in this code.
- `ops.internal_accounts` — L27, L162–L163, L313–L314. Staff table is not written.

Hard-excluded accounts (not purged even if marked deleted over 90 days):

- Hardcoded `7c71e421-…` — L22, L43, L116, L522–L524.
- Every `ops.internal_accounts.user_id` — L22–L23, L117.
- Test fixtures — L24–L25, L118–L129.

Apply-mode backup (created only in `apply`, then left in the database):

- Schema `zz_bak_p1_25_<UTC stamp>` plus `manifest` and copied inventory / storage tables — L331–L428, return key `backup_schema` L542. Kept until a separate drop.

`account_deletion_requests`:

- **Deleted** for qualifying `user_id` (L176, L430–L449). Not a leftover of this function.

Auth rows:

- `auth.users` for qualifying ids **is** deleted at the end of apply (L515–L520), after inventory deletes (L430). Cascades: `identities`, `sessions`, `mfa_factors`, `mfa_recovery_code_sets`, `oauth_authorizations`, `oauth_consents`, `one_time_tokens`, `webauthn_challenges`, `webauthn_credentials` (all `ON DELETE CASCADE` in the live catalog). `refresh_tokens` cascade from `sessions`.
- **Left:** `auth.audit_log_entries` — not in `_rels`; columns are `id`, `instance_id`, `ip_address`, `payload` (json), `created_at`; no user_id FK. Payloads may still identify a user. Not copied, not deleted.
- **Left:** `auth.flow_state` — has `user_id`; no foreign key to `auth.users` was returned in the live catalog; not in `_rels`.
- **Left:** `auth.scim_users` — `user_id` is `ON DELETE SET NULL`; the row remains.
- Other auth catalog tables (`instances`, `schema_migrations`, `oauth_clients`, `sso_*`, `saml_*`, `custom_oauth_providers`, `scim_tokens`, etc.) are not user-row inventory and are not touched.

Storage:

- Matching `storage.objects` **are** copied then deleted when `owner` / `owner_id` equals a qualifying id, or `name` equals a qualifying `progress_photos.storage_path` (count L291–L311; copy L405–L428; delete follows the same predicate in the storage delete block after the inventory loop). Objects that do not match those predicates **remain**.
- `storage.buckets` (has `owner` / `owner_id`), `storage.s3_multipart_uploads` and `_parts` (`owner_id`), analytics/vector/migration tables: not in the inventory, not deleted.

Events and analytics leftovers:

- `public.product_events` **is** in `_rels` (L173) and is deleted when `user_id` still matches. Live FK is `ON DELETE SET NULL`. If the 30-day step already deleted `auth.users`, those event rows already have a null `user_id` and **cannot be attributed or removed** by this function (same for `client_feedback`, L174, also SET NULL). Those unlinked rows remain.
- Platform / Studio logs, Log Drains, and any off-site analytics are outside the database function and are not touched. Official log windows on the pricing page (Pro 7 days, Team 28 days) are under 90 days; Free log retention days were not stated on the fetched pricing or backups pages; actual log contents were not listed (no log-list tool used).

Tables not in `_rels` that can keep user-tied data (live catalog, 2026-11-16):

- `public.athlete_injuries`, `public.attendance`, `public.coach_competitors` — have `athlete_user_id` with **no FK** to users. Only `coach_id` cascades to `public.coaches` (and `coaches` is in the inventory, L207). If the purged account is the athlete, these rows remain (notes, body part, attendance, competitor details).
- `public.leads` — `converted_user_id` is `ON DELETE SET NULL` to `public.users`. The lead row (email, name, `assessment_data`) remains, unlinked. Not in `_rels`.
- `public.schools` — `admin_id` is `ON DELETE SET NULL`. The school row remains, including any `stripe_customer_id` / `stripe_subscription_id` on it. Not in `_rels`.
- `public.coach_journal_notes`, `public.coach_teaching_log` — keyed by `coach_id` with CASCADE to `public.coaches`. If the coaches row is still present, inventory delete of `coaches` (L207) cascades them. If the coaches row was already gone, they are already gone. Not independently listed in `_rels`.
- `public.consents`, `public.user_ads_consent` — CASCADE from `auth.users`; not kept (see mismatch 6).
- `public.workout_exercises` — no `user_id`; tied through `workout_id`. `workouts` is in `_rels` (L216). Not independently listed.
- Pre-account or unlinked email lists, not keyed for this purge: `public.investor_requests`, `public.partner_inquiries`, `public.sport_pack_waitlist`, `public.yoga_testers`.
- `public.rate_limit_buckets` (`bucket_key`, no user_id), `public.ai_research_cache` (query text, no user_id), reference tables (`exercises`, `techniques`, `sport_config`, `rombot_knowledge`, `rom_thresholds`, etc.), `ops.feature_flags`, and `public.zz_bak_rombot_knowledge_null_ids_20261103`: not user-keyed by this inventory, not touched.
- `session_feedback` / `assessment_feedback` (P1-18 build, not live, not in `_rels`): if those tables ship before this inventory is updated, they would not be copied or deleted by this function except where a live FK cascade already covers them.

Stripe-side data:

- The function never calls Stripe. `public.stripe_checkout_claims` **is** in `_rels` (L175) and is deleted when `user_id` still matches (no-FK survivor of an earlier auth delete). Stripe customers, subscriptions, invoices, and payment methods on Stripe's side remain. `billing_consents` still holds Stripe ids for kept rows.

Logs (application tables vs platform):

- `public.email_sends` and `public.push_sends` **are** in `_rels` (L200–L201) and are deleted when `user_id` still matches.
- `auth.audit_log_entries` remains (above).
- Supabase platform logs are untouched.

Open requests and under-retention completed deletions:

- Not qualified, so all of their rows stay (L20–L21, L91–L100). This matches Stacy.

---

## 4. Sources (this receipt)

- MCP (read-only): `get_organization` id `chytcvuxbohgnvoxobsj`; `get_project` id `cqzvqzwwevnflinxgnpp`; `list_projects`; `list_organizations`; `execute_sql` catalog/FK reads only on project `cqzvqzwwevnflinxgnpp`. No `list_backups` tool in the installed namespace.
- Docs: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery .
- Code: `20261117010000_p1_25_purge_deleted_accounts.sql` at 1607d0c3, sha256 de9996d717ab4aafc030cf91d0e4eb9e1dabd458d8272588b36c83a50e447552.
- Stacy: `/workspace/process/evidence/STACY-P1-25-PURGE-PRIVACY-LINE-20261116-1918.md`, sha256 b07f05e129c3f9de7d8651307a10fd5ceb476fdcb852fb18000a14dd9219801c.
- Prior package receipt (untouched): `RECEIPT-P1-25-PURGE-20261116.md`, sha256 5c8ee9298f6146540aef974da2723668e1a5be940719330ff94f86569b678a7c.

No live writes. Function remains unapplied.
