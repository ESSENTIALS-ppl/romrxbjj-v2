# SOURCE FINDING: who set 7c71e421 opt-ins at 8:33:13 PM ET Mon Nov 16 2026

Read-only. Project `cqzvqzwwevnflinxgnpp`. Times in America/New_York (ET). No secrets, tokens, user addresses, or full IPs are printed. IPs are masked to a /16 (IPv4) or /32 (IPv6). Account `7c71e421-929b-4691-a6bc-cc614ed2a08d` was not written, flagged, or edited (L968).

## Verdict

**Jim's own session.** The three explicit opt-in markers were set by the signed-in user, from an iPhone Safari session on `https://romrx.io/`, by calling the public RPC `set_reminder_opt_in` three times. This was not a team or bot write, not service_role, not the SQL editor, and not the Supabase CLI / management API.

## What changed

Table: `public.notification_preferences`.

Read at 8:55 PM ET (and again at 8:57 PM ET):

- `retest_opt_in_at` = 8:33:13.040 PM ET (`2026-11-17 01:33:13.04065+00`)
- `protocol_opt_in_at` = 8:33:13.136 PM ET (`2026-11-17 01:33:13.136868+00`)
- `digest_opt_in_at` = 8:33:13.233 PM ET (`2026-11-17 01:33:13.233535+00`), same as `updated_at`
- Toggles: `retest_reminders=true`, `email_reminders=true`, `weekly_digest=true`
- Row `created_at` is still Jul 6 2026. `reminder_time` `07:00`, timezone `America/New_York`

v4 had recorded, read-only at 8:26 PM ET, that all three markers were null and weekly digest was false. The markers were written seven minutes later.

`public.users.updated_at` for the same id is 8:33:12.218 PM ET (`2026-11-17 01:33:12.218604+00`), one second before the first opt-in, from a separate PATCH (below). No `account_deletion_requests` or other audit/history table holds these opt-in writes. `auth.audit_log_entries` has 0 rows. The `notif_opt_in_guard` and `notif_updated_at` triggers fire on this table but are not an external writer.

## Auth and session

- `auth.users.last_sign_in_at` is still Nov 3 2026 6:32:52 AM ET. Tonight was a **refresh of an existing session**, not a new login.
- `auth.sessions` id `2a597e96-708d-4bc4-b84c-5d1f62be0a51`, created Nov 3 2026 6:32:52 AM ET, `updated_at` / `refreshed_at` 8:31:05 PM ET, user-agent class **ios-safari** (iPhone, iOS 18.7, Safari/AppleWebKit), IP `166.198.x.x`.

Auth logs at 8:31:05 PM ET (`2026-11-17T01:31:05Z`):

- `auth_audit_logs` id `ed37dd06-1f78-41ed-8f19-517846e26e04`, action `token_revoked`, actor_id 7c71e421, audit_log_id `f79f1934-f08f-41d9-a851-3a68da56f6ab`, request_id `01a1e721-0d66-789c-9b83-a7ab9d830b48`, same iPhone Safari UA. IP empty in the audit payload.
- `auth_audit_logs` id `603f9021-96a7-41be-bbee-951544cf0a63`, action `token_refreshed`, same actor_id, audit_log_id `dd1519e7-ddc9-4003-995c-cdcefbdabd79`, same request_id and UA.
- `auth_logs` id `9f4037f3-04e8-4fdd-9536-3fc075654c74`, action `login`, login_method `token`, user_id 7c71e421.
- `auth_logs` id `22f3395b-384a-4421-9734-098c339fb7dd`, POST, grant_type `refresh_token`, status 200, subject 7c71e421, IP `166.198.x.x`.
- `edge_logs` id `74c16470-6d23-4833-985d-ca8cd918214c`, POST `/auth/v1/token?grant_type=refresh_token`, status 200, session `2a597e96-...`, `x-client-info` `supabase-js/2.109.0; runtime=web`, referer `https://romrx.io/`, IP `166.198.x.x`, 8:31:05.446 PM ET.

## Product events (same session)

Page views, source `web`, user 7c71e421, starting at 8:31:06 PM ET: `/app/dashboard/my-body` (id 11869), my-protocol (11870), my-fuel (11871), my-sport (11872), rombot (11873), rometer (11874), **settings at 8:32:18.198 PM ET** (id 11875). After the opt-ins: my-body at 8:33:38.292 (11876), my-protocol at 8:34:03.365 (11877).

## The writes (edge / PostgREST)

All of the following are `edge_logs`, role **authenticated**, JWT subject **7c71e421-929b-4691-a6bc-cc614ed2a08d**, session **2a597e96-708d-4bc4-b84c-5d1f62be0a51**, `x-client-info` `supabase-js/2.109.0; runtime=web`, iPhone Safari UA, IP `166.198.x.x`, referer `https://romrx.io/`.

Settings page load:

- 8:32:18.237 PM ET, GET `/rest/v1/notification_preferences?select=*&user_id=eq.7c71e421-...`, status 200, id `d103b02b-e027-47a0-844e-4d913f3742f8` (OPTIONS immediately before: `ff29c811-6afd-4b89-9eab-d6fed7068bcc`).

A settings save, one second before the opt-in markers:

- 8:33:11.807 PM ET, PATCH `/rest/v1/users?id=eq.7c71e421-...`, status 204, id `222bda11-e7aa-45c9-b0d2-fa0cbc9da528` (matches `users.updated_at`).
- 8:33:12.721 PM ET, POST `/rest/v1/notification_preferences?on_conflict=user_id`, status 200, id `dacab8b7-4e60-4476-82a7-b41844c36ace` (plain upsert; live comments say a plain save does not set the explicit markers).

The three opt-in markers, matching the three `*_opt_in_at` timestamps:

- 8:33:13.001 PM ET, POST `/rest/v1/rpc/set_reminder_opt_in`, status 204, id `3b0cf3c1-a6f7-4767-a311-74f06acea890` (retest `.04065`)
- 8:33:13.100 PM ET, POST `/rest/v1/rpc/set_reminder_opt_in`, status 204, id `c44ecb57-6dcd-4198-a08b-1bed5aad76a7` (protocol `.136868`)
- 8:33:13.203 PM ET, POST `/rest/v1/rpc/set_reminder_opt_in`, status 204, id `e1fade7b-b49e-49be-9c54-f4f0e61e10c6` (digest `.233535`)

No `save-notification-prefs` (or similar) edge function was invoked for these writes. The client called the PostgREST RPC directly.

## Nearby activity that did **not** set the opt-ins

- 8:32:18–8:32:19 PM ET: edge function `create-portal-session` (function_id `7e38aed0-87a9-45f7-aa40-3e61c1c0b431`) boot + OPTIONS + POST 200 (function_edge_logs ids `abb6a484-4581-4552-a8c4-c304a87bad01`, `6f178bda-917f-46e8-be20-039aee1973f1`). That is the billing-portal helper on the settings screen, not the opt-in RPC. It shut down at 8:33:33 PM ET (`1529bc0c-6b21-4f78-aede-85331d354d8d`).
- 8:33:27 PM ET: `service_role` + `node` + IP `13.184.x.x` posted `consent_events` (id `ada96f44-bb3d-4eb1-a67e-8a1f57cbcdd8`, 201) and `user_ads_consent` (id `ac95d385-74cd-449f-bba5-88a821374691`, 200). About 14 seconds after the opt-ins, different role and IP, ads-consent path, not `notification_preferences`.
- 8:33:45 PM ET: `postgres_logs` id `b8a1c21a-884d-43c7-a065-a9ae707ba556`, application `mgmt-api`, user `postgres`, IPv6 `2600:1f18::/32`, a catalog SELECT. After the opt-ins.
- 8:34:01 and 8:34:10 PM ET: `postgres_logs` ids `6c149ffb-47df-4fb6-aa0f-6d3ebbc13a30` and `5da7f3a1-8979-4647-9aaf-b1bb8a28b141`, also `mgmt-api` / `postgres` / `2600:1f18::/32`, statements that begin applying the already-planned P1-25 migrations (`20261117013401` and `20261117013410`). Those receipts already record those apply times. They are not opt-in writes.
- PostgREST logs in the 8:32:30–8:34:00 PM ET window are only Warp timeout / schema-cache messages, not the request log of the RPCs (those appear in `edge_logs` as above).
- Sable created the CLI token `romrx-cli-20261116` through GitHub at about 8:33 PM ET (L1296). That timing is coincidental. The opt-in requests used an authenticated user JWT and `supabase-js` in the browser, not `postgres`, not `mgmt-api`, and not a Deno/CLI user-agent.

No box transcript showed a bot calling `set_reminder_opt_in` or writing this prefs row at 8:33 PM ET.

## Bottom line

The opt-ins were turned on in the ROMRx web app settings screen by Jim's own signed-in iPhone session. A team or bot did not set them.
