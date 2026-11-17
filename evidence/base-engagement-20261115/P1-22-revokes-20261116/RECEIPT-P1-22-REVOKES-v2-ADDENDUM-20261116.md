# ADDENDUM: P1-22 revokes v2 — parent proof, test harness committed (BUILD ONLY)

Monday Nov 16, 2026, 8:20 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied. This file does not replace RECEIPT-P1-22-REVOKES-v2-20261116.md (sha256 ee1736982b0d6fa8457c706b4ae019d0ee5b758b23eb23676b3f7e4ad8304808) or SHA256SUMS-v2 (544e2f168a314346d7128d4a10fb388d4507ed35464bf5ffc7fded2ec258a176); those were not edited.

Authority: Grant, 8:19 PM ET, P1-22 v2. Apply still waits for Vera's v2 recheck.

## 1. Parent and range vs origin/main

After `git fetch` (8:19 PM ET):

- `git rev-parse 15d074fc^` = **a34aa573a160c674cfdf9660cec30304161f1044**
- `git rev-parse origin/main` = **a34aa573a160c674cfdf9660cec30304161f1044** (MATCH)

`git diff origin/main..15d074fc --stat` (verbatim):

```
 ...0000_p1_22_revoke_anon_execute.rollback.sql.txt | 30 +++++++++++
 .../20261117020000_p1_22_revoke_anon_execute.sql   | 62 ++++++++++++++++++++++
 2 files changed, 92 insertions(+)
```

The only change on 15d074fc versus origin/main is the two revoke migration files.

## 2. PGlite test script (11/11 v2 run)

- sha256 **f7638f7edb138a4a4fae98603273b5827b9f5aa3e3a5c3c76c0f6305af004532** (starts f7638f7e, verified)
- Source of the v2 11/11 run: /tmp/p122-revoke-retest-20261116/test.mjs, byte-identical to /workspace/process/batches/base-engagement-20261115/P1-22-revokes-20261115/test/test.mjs
- Address check: no email addresses. The only `@` is the package import `@electric-sql/pglite`. Allowed list (user@example.com, hello@romrx.io, reid@romrx.io) was not needed; nothing was held back.
- Committed as its own commit, no other changes, on fix/p1-22-revoke-anon-execute-v2-20261116:
  - path: **supabase/tests/p1-22/test.mjs**
  - sha256 at that path: **f7638f7edb138a4a4fae98603273b5827b9f5aa3e3a5c3c76c0f6305af004532** (unchanged)

## 3. New tip and patch ids

- New tip: **6311f3016dfbf7103e685af232189aca371194ee**
- Parent of the test commit is 15d074fcc27bbf7fa6fd22807c87848d17f1cb20
- New commit patch sha256 (`git show --format= --patch`): **1c83709d3e2ac1eafc9cc0a3c7a8d4bc466d2a7440b6fef224776ecd3f43d022**
- New commit `git patch-id --stable`: **13006c6928bf6bd4cea40d2107bddec6522d50e6**
- Whole-branch `git diff origin/main..6311f30 | git patch-id --stable`: **f215683fc0eb581c66aa5d3d759c261ef73f52ea**

Plain push with explicit refspec `HEAD:refs/heads/fix/p1-22-revoke-anon-execute-v2-20261116`. `git ls-remote` 8:20 PM ET: tip 6311f3016dfbf7103e685af232189aca371194ee. Old branch still 72d57ad97dd9efaac8bdc02f927c660318987906. origin/main still a34aa573a160c674cfdf9660cec30304161f1044.

Whole-branch `git diff origin/main..6311f30 --stat` is the two migration files plus supabase/tests/p1-22/test.mjs (3 files, +432).

## Not done

Nothing applied. Apply still waits for Vera's v2 recheck and a Margot gate line.
