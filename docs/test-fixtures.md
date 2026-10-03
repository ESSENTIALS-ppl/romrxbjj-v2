# Test fixtures (since 2026-10-02)

`public.is_test_account(email)` is true only when BOTH hold:
1. email matches `^jim\+romrx-[a-z0-9._-]+@romrx\.io$`, and
2. the account's `auth.users.raw_app_meta_data.test_fixture` is `true` (service role only; signed-in users cannot set it).

Test-mode checkout, the test-mode portal and the test-mode Stripe webhook path all depend on this.

## New fixture (3 steps)
1. Sign up normally with `jim+romrx-<name>@romrx.io`.
2. Flag it: `bash scripts/flag-fixture.sh jim+romrx-<name>@romrx.io` (needs `SUPABASE_SERVICE_ROLE_KEY` in env) or run
   `select public.flag_test_fixture('jim+romrx-<name>@romrx.io');` with a service-role SQL tool. Result must be 1.
3. Reload the app and run the flow; test-mode checkout now works. An unflagged fixture behaves like a real customer.

## Unflag / rollback
`update auth.users set raw_app_meta_data = raw_app_meta_data - 'test_fixture' where email = '<email>';`
