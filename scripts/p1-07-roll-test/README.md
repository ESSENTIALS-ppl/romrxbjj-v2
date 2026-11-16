P1-07 v3 (window through local day 14) rules 1-3 test. `npm install && node roll.test.mjs` (PGlite, writes cases.json), then
`node backfill.test.mjs`, then `LIFECYCLE_SRC=<lifecycle-emails dir at 6d25bb35> deno test --allow-read --allow-env --no-lock email-lines.test.ts`.
