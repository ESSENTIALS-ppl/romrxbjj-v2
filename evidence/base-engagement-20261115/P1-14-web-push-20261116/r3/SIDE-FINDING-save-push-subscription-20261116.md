# Side finding: live save-push-subscription can silently reassign an endpoint (REAL)

Read-only this turn: MCP `get_edge_function` and `list_edge_functions` on project cqzvqzwwevnflinxgnpp, plus a schema-only read of `push_subscriptions` (UNIQUE on `endpoint`; cap trigger `push_subscriptions_cap` raises 23514 at 10 live rows). No prod row writes, no deploy, no secret access.

## Live identity

- slug: `save-push-subscription`
- listed this turn: version **21**, ezbr_sha256 `5d123c2b6955e631531cc5d753c199d5e2eaeee28dd47f72eddf84bfbb02f35c`, verify_jwt true
- updated_at: 2026-11-02 21:56 ET
- The r2 receipt called this same ezbr **v20**. The source comments still say v19. Bytes and update time match the earlier read; only the listed version number differs.
- A byte copy of the two live source files is in `r3/side-finding/live-save-push-subscription-v21/` (index.ts sha256 `b3686a4e3f1d948872de42d07eafdc5465c964a7c735e76e24fdb3ff377bf42a`, handler.ts sha256 `d209096e015030e2667c7d6395fa61e6472363c5b0793969bb57ba7847f14c06`). No secrets in those files (env names only).

## Verdict: REAL

`index.ts:17` updates `push_subscriptions` by endpoint only and **writes `user_id`** to the caller:

```
.update({ user_id, p256dh: s.keys.p256dh, auth: s.keys.auth, failure_count: 0, disabled_at: null }).eq("endpoint", s.endpoint).select("id")
```

There is no `.eq("user_id", user_id)`. Because `endpoint` is UNIQUE, this moves the existing row to the caller: a silent reassign.

The handler documents that behaviour at `handler.ts:8` ("Re-points an existing device row to this user") and calls it at `handler.ts:41`:

```
if (!(await d.touch(uid, s))) { if ((await d.insert(uid, s)) === "limit") return json({ error: "device_limit_reached" }, 409); }
```

`legacy` at `index.ts:28-30` still upserts `notification_preferences.push_subscription` for the caller (kept in r3).

## r3 fix (unapplied, not deployed)

- `touch` matches only the caller's own rows (`.eq("endpoint", …).eq("user_id", …)`) and does not write `user_id`.
- If another user owns the endpoint: count the caller's live devices; if already at 10, return 409 and leave the other row; otherwise delete that other row (`id` + `endpoint` + `user_id <> caller`) and insert a fresh row for the caller. New row id, never an in-place reassign.
- Legacy jsonb write is unchanged.
- Tests: own-row keeps the same id; cross-user deletes old id and inserts a new one; cap leaves the other user's row; source grep forbids `.update({ user_id`; planted mutants that skip takeover and insert (the live path) are caught.

Open race, not fixed in this build: if the pre-delete count is under 10 and a concurrent insert then trips 23514, the other user's row has already been deleted and is not automatically restored. No migration was added.
