# ROLLBACK: P1-23 EXPORT_MY_DATA / SHOW_EXPORT_MY_DATA flip (not run)

BUILD ONLY. Nothing was flipped, published, or set.

## Order (UI first, then the secret)

1. If a SHOW_EXPORT_MY_DATA=true sha has been published, restore the pre-unhide Netlify deploy and lock it. As of the live read in this pack, that rollback target is deploy 6afba1b9a6f1c859e9d9695c (romrx.io 29eb4fa66f920450d71c44e6edbad123cfd38596, published Monday Nov 16, 2026 7:37:46 PM ET, locked; the previous TZ deploy 6afb9d261d2f405269bcab7a remains listed and unlocked). Confirm at rollback time with getSite; if live has moved, use the deploy that was live immediately before the unhide publish. Method: unlock the then-live deploy, restoreSiteDeploy of the pre-unhide id, lock it, then a cache-busted read-back of /app/ showing the pre-unhide JS bundle and no Export my data button. Credits: restore costs none.
2. Set the Edge Function secret EXPORT_MY_DATA to any value other than the exact string on (empty or off both work). flagOn is `v === "on"` only (live export-my-data v2 handler.ts).
3. Read-back, no user JWT and no export: POST /functions/v1/export-my-data with the publishable anon key only must return 503 {"error":"export_disabled"}. That check precedes auth, so it does not read user rows.

SHOW_DELETION_STATUS stays false throughout. Do not touch LIFECYCLE_EMAILS_SEND, LIFECYCLE_AUDIENCE, ROMBOT_CHECKIN_SEND, QUICK_CHECK_ON, or RENEWAL_BASE_SEND. Do not redeploy export-my-data or request-account-deletion as part of this rollback.
