P1-07 rules 1-3 test. `npm install && node roll.test.mjs` (PGlite, writes cases.json), then
`node backfill.test.mjs`, then `LIFECYCLE_SRC=<lifecycle-emails dir at W2 b8fcae18> deno test --allow-read --allow-env --no-lock email-lines.test.ts`.
