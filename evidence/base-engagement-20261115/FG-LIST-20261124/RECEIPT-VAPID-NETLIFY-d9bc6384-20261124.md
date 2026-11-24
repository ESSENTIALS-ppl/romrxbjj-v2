# RECEIPT FG-12 prerequisite: VITE_VAPID_PUBLIC_KEY set on Netlify romrx.io (site d9bc6384), Tue Nov 24 2026 (ET)
Authority: Grant/parent 3:57 PM ET item (a), 4:11 PM ET "do VAPID right away". Public key only; value never printed.
BEFORE (env names only, NETLIFY-ENV-NAMES-BEFORE-d9bc6384.txt, ~4:03 PM ET): 11 vars; VITE_VAPID_PUBLIC_KEY absent.
SET (4:13:15 PM ET): netlify api createEnvVars, account 6984fb3b, site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b, key VITE_VAPID_PUBLIC_KEY, context production only, scopes builds/functions/post_processing/runtime, not secret. Value read from process/evidence/AVERY-VAPID-PUBLIC-KEY-20261117.txt (87 bytes, sha256 8dcb59b6).
AFTER (NETLIFY-ENV-NAMES-AFTER-d9bc6384.txt): 12 vars = BEFORE + VITE_VAPID_PUBLIC_KEY [production]. Read-back value equals the file (compared in code, not printed). Diff vs BEFORE is that one line plus trailing-space formatting only.
Lock and publish unchanged: published deploy 6afbc0d63fb2af5613761122, locked true, stop_builds true. No unlock, no auto-publish change, no build or deploy triggered.
Rollback (not run): netlify api deleteEnvVar account 6984fb3b, site d9bc6384, key VITE_VAPID_PUBLIC_KEY. Never while WEB_PUSH_SEND is on.
Caveat: romrx.io publishes are local-build API digest deploys, so this env var only reaches a Netlify-side build (or a local `netlify build --context production` that reads site env). Jules's local build must still carry the key; the r10b receipt says it did (same 8dcb59b6 file).
