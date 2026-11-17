# RECEIPT v3: P1-08 quick-check suppression guard, rollback-copy fix. BUILD ONLY.

Written Mon Nov 16, 2026, about 7:19 PM ET by Avery. Not deployed, nothing applied, no Supabase writes (one read-only `get_edge_function` each for lifecycle-emails and unsubscribe), no secret or flag writes. `LIFECYCLE_EMAILS_SEND` is untouched. `fb53b850` stays on hold (L1199).

This receipt supersedes the rollback-copy claims in `RECEIPT-P1-08-QC-GUARD-v2-20261116.md` (sha256 `aa254589f7b4f4972ee3a3b0231da2360c17981ed2d6eaceb771301052a5b77d`). That older file is not edited. The typings fix, the empty source/ diff vs `a41a3029`, the 85/85 and 24/24 test totals, and the rollback *targets* (live lifecycle-emails v3 first, then live unsubscribe v13, both with `verify_jwt` false) are unchanged. What v2 got wrong is the rollback SUMS format and what was actually present in the git evidence commit.

## What v2 got wrong

1. **`SHA256SUMS-ROLLBACK-LIVE` is in a non-standard format.** Each line is `<sha256>  <size>  <path>`, with a size column between the hash and the path. `sha256sum -c SHA256SUMS-ROLLBACK-LIVE` therefore fails on all 15 lines. The file (sha256 `c0cba7fe6a8a1a62453cdb0ab0c54d021596031faae1102cdace94749995786b`) is left in place and is not overwritten. The replacement Vera should check is `SHA256SUMS-ROLLBACK-LIVE-v3`, in standard `<sha256>  <path>` format.

2. **Evidence commit `a23aed1d` held back `source/index.ts` and `source/email.ts` of the live v3 rollback copy**, along with four other files, under the standing evidence rule (no addresses other than `hello@romrx.io`, `reid@romrx.io`, or `user@example.com` in git evidence). That is why Vera saw 8 of 10 files under `rollback/live-lifecycle-emails-v3/` on the evidence branch, and why 6 of the 53 `SHA256SUMS-v2` entries were unreadable in a git checkout. On disk, all 10 live-v3 files were already present, including those two, and `sha256sum -c SHA256SUMS-v2` was already clean. The six files remain on disk and are still not committed. See `HELD-BACK-FROM-GIT-EVIDENCE-v3.md`. The addresses themselves are not printed here.

## Live hash check (read-only, Mon Nov 16, 2026, 7:17 PM ET)

Project `cqzvqzwwevnflinxgnpp`. `get_edge_function` only. No deploy, no env or secret reads or writes.

| Function | version | status | verify_jwt | ezbr_sha256 | prefix check |
|---|---|---|---|---|---|
| lifecycle-emails | **v3** | ACTIVE | false | `d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e` | starts `d68e443b` — **MATCH**, no drift |
| unsubscribe | **v13** | ACTIVE | false | `cfb084bb0afa91b1399a0fa8e269ad736ae445bd46f535cfd7aeb5c92fba7157` | starts `cfb084bb` — **MATCH**, no drift |

Entrypoints remain `source/index.ts`. All 10 files under `rollback/live-lifecycle-emails-v3/` sha256-match and size-match the live v3 bytes just pulled. All 5 files under `rollback/live-unsubscribe-v13/` sha256-match and size-match the live v13 bytes just pulled. No drift; nothing was rewritten on disk.

## SUMS Vera should check, ON DISK

Check these two files against the on-disk folder, not against a git checkout alone (the six held-back files are on disk and listed in `SHA256SUMS-v2`, but they are not in git).

`sha256sum -c` totals, Mon Nov 16, 2026, 7:19 PM ET, ON DISK in this folder:

| SUMS file | sha256 of the SUMS file | OK | missing | failed |
|---|---|---|---|---|
| `SHA256SUMS-ROLLBACK-LIVE-v3` | `b26a1408a37e0498e6fdce331ef07649f450af6e57586abef3c56bd0662c13c0` | **15** | **0** | **0** |
| `SHA256SUMS-v2` | (unchanged; itself listed in the v2 receipt tree) | **53** | **0** | **0** |

`SHA256SUMS-ROLLBACK-LIVE-v3` covers the same 15 rollback files as the old LIVE SUMS, in the same order, without the size column. `SIZES-ROLLBACK-LIVE-v3.txt` (sha256 `20ffd889abf472c20dc4679f34ad97424ee23441e24eca1e0b0989096a2f1588`) lists those sizes separately.

`SHA256SUMS-v3` covers this receipt, `SHA256SUMS-ROLLBACK-LIVE-v3`, `SIZES-ROLLBACK-LIVE-v3.txt`, and `HELD-BACK-FROM-GIT-EVIDENCE-v3.md` (sha256 `4dd124b461d6decccbc9f051383757af2c9634337463201b980c64a18a26c433`). It is checked with `sha256sum -c` after it is written. It does not list itself.

## Git evidence

New files in this folder, plus every rollback file that passes the address rule, go to `evidence/base-engagement-20261115/P1-08-qc-guard-20261116/` on `evidence/receipts-rebuilt-20261115`. The six held-back files are not committed. The passing rollback files were already in `a23aed1d`; this commit adds the new v3 files only.

## Not in this work

- No deploy today. No secret or flag reads or writes.
- `LIFECYCLE_EMAILS_SEND` stays not `"on"` and is not touched.
- `/workspace/SHA256SUMS` is not touched. No existing file in this folder is overwritten or deleted, including `SHA256SUMS-ROLLBACK-LIVE` and `SHA256SUMS-v2`.
- The v2 receipt `aa254589…` is not edited.
