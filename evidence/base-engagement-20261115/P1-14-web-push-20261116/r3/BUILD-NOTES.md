# P1-14 r3 BUILD NOTES (2026-11-16, Avery)

BUILD ONLY. Nothing deployed, no secret set, no cron change, no prod row writes.

Repo worktree: `/workspace/wt-p1-14-r3-20261116` on `feat/p1-14-r3-20261116`, parent `a4c97233` (r2; not pinned).

## Hunks (every hunk, exact, as `git diff a4c97233..6bde1ac8` prints them)

| # | File | Hunk header |
|---|---|---|
| 1 | `supabase/functions/save-push-subscription/handler.test.ts` | `@@ -0,0 +1,231 @@` |
| 2 | `supabase/functions/save-push-subscription/handler.ts` | `@@ -0,0 +1,64 @@` |
| 3 | `supabase/functions/save-push-subscription/index.ts` | `@@ -0,0 +1,52 @@` |
| 4 | `supabase/functions/send-push-notification/handler.r2.test.ts` | `@@ -36,6 +36,8 @@ function deps(mod: typeof H, over: Partial<Deps> = {}): Spy {` |
| 5 | `supabase/functions/send-push-notification/handler.r2.test.ts` | `@@ -157,8 +159,8 @@ Deno.test("r2 quiet: user timezone is used; null or invalid falls back to Americ` |
| 6 | `supabase/functions/send-push-notification/handler.r2.test.ts` | `@@ -170,7 +172,7 @@ Deno.test("r2 dry-run: no network push, no claim, and it reports skip counts", a` |
| 7 | `supabase/functions/send-push-notification/handler.r2.test.ts` | `@@ -213,8 +215,10 @@ async function filtersOk(m: typeof H) {` |
| 8 | `supabase/functions/send-push-notification/handler.r2.test.ts` | `@@ -237,7 +241,8 @@ const MUTANTS: [string, string, string][] = [` |
| 9 | `supabase/functions/send-push-notification/handler.r3.test.ts` | `@@ -0,0 +1,227 @@` |
| 10 | `supabase/functions/send-push-notification/handler.test.ts` | `@@ -30,6 +30,8 @@ function base(over: Partial<Deps> = {}): Deps {` |
| 11 | `supabase/functions/send-push-notification/handler.test.ts` | `@@ -196,17 +198,45 @@ Deno.test("duplicate claim is skipped, second call does not send", async () => {` |
| 12 | `supabase/functions/send-push-notification/handler.ts` | `@@ -4,6 +4,10 @@` |
| 13 | `supabase/functions/send-push-notification/handler.ts` | `@@ -34,8 +38,10 @@ export interface Candidate {` |
| 14 | `supabase/functions/send-push-notification/handler.ts` | `@@ -63,6 +69,16 @@ export function inQuietHours(now: Date, tz: string | null | undefined): boolean` |
| 15 | `supabase/functions/send-push-notification/handler.ts` | `@@ -75,6 +91,10 @@ export interface Deps {` |
| 16 | `supabase/functions/send-push-notification/handler.ts` | `@@ -122,11 +142,12 @@ export async function handle(req: Request, d: Deps): Promise<Response> {` |
| 17 | `supabase/functions/send-push-notification/handler.ts` | `@@ -137,9 +158,18 @@ export async function handle(req: Request, d: Deps): Promise<Response> {` |
| 18 | `supabase/functions/send-push-notification/handler.ts` | `@@ -147,6 +177,7 @@ export async function handle(req: Request, d: Deps): Promise<Response> {` |
| 19 | `supabase/functions/send-push-notification/handler.ts` | `@@ -158,5 +189,7 @@ export async function handle(req: Request, d: Deps): Promise<Response> {` |
| 20 | `supabase/functions/send-push-notification/index.ts` | `@@ -2,6 +2,8 @@` |
| 21 | `supabase/functions/send-push-notification/index.ts` | `@@ -167,10 +169,31 @@ async function markSuccess(subscriptionId: string | null): Promise<void> {` |
| 22 | `supabase/functions/send-push-notification/index.ts` | `@@ -200,5 +223,7 @@ Deno.serve((req) =>` |

22 hunks. Full patch: `r3/6bde1ac8.patch`.

## What each group of hunks does

- Hunks 1-3: new `save-push-subscription` function (not previously in this repo at a4c97233). Live silent-reassign of `user_id` on an endpoint match is fixed: touch is scoped to the caller; cross-user endpoints are deleted and inserted fresh. Legacy jsonb write kept. Tests and planted mutants included.
- Hunks 4-8: r2 tests updated so quiet-hour skip cases use a system nudge (retest), the protocol exemption is asserted in `filtersOk`, and a new planted mutant catches applying quiet hours to protocol.
- Hunk 9: new r3 tests for the 9:30 PM protocol exemption, system-nudge quiet skips, 404/410 cleanup (including jsonb-only candidates and a second live device after a dead first device), dry-run `would_clear` with no writes, and six planted mutants.
- Hunks 10-11: existing handler tests gain `clearDead`/`releaseClaim` deps; the old "410 is gone" case now asserts clear + claim release + not failed, and a non-gone failure still marks failed.
- Hunks 12-19: handler behaviour: protocol exempt from quiet hours; `clearDead`/`releaseClaim` on `result.gone`; response adds `cleared` and `would_clear`.
- Hunks 20-22: index.ts implements `clearDead` (delete that user's table row by id+user_id; null legacy jsonb only when the stored endpoint matches, including as a fallback after a table-row clear) and `releaseClaim` (delete `push_sends` by user_id+dedupe_key).

## Not changed

- PUSH_COPY / `push_copy.cleared.json` (sha256 `c05a9670…` unchanged from r2).
- `is_test_account` filter, fail-closed unknown flag, no user-id special case (7c71e421 is not mentioned in source).
- `sendEnabled` exact `"on"` gate.
- Default `listDue` kinds remain protocol and retest only (digest is not sent by this cron).
- hello@ device-limit support clause stays dropped (receipt only; no client string in this commit).
- No cron SQL, no secret, no deploy.
