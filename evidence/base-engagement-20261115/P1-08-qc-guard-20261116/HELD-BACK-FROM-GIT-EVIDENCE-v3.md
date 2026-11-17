# Held back from git evidence (P1-08 QC-guard v3)

These six files are on disk in this folder and are listed in `SHA256SUMS-v2`. They were left out of evidence commit `a23aed1dc5fce822b5a859ad55a7d846759ae2a4` (and are still left out of the v3 evidence commit) under the standing evidence rule: a file is not committed to the evidence branch if it contains email addresses other than `hello@romrx.io`, `reid@romrx.io`, or `user@example.com`.

All six **are on disk** at the paths below for Vera to read. This list does not print the addresses.

| path | sha256 | reason |
|---|---|---|
| `diffs/a41a3029-vs-b19b13dc.diff` | `d761f39a3c8b015e70b554de7a2d7a61e6ae57598be4ea29a9c23240bb318fe3` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |
| `diffs/fb53b85-vs-b19b13dc.diff` | `932d7597b575628e0ead3b4a7f1e92cf7d7da5534fa778785455d899f38c7af1` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |
| `rollback/live-lifecycle-emails-v3/source/index.ts` | `c4ec33969ffb7d3396f7450f6c28ab115d9982d91cb635ea8a8a9dd3303d8629` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |
| `rollback/live-lifecycle-emails-v3/source/email.ts` | `51c9558cef1eb6ca65a97f99666e8bf0df1bb28ef2063caae731aa80d4c4e40c` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |
| `rollback/b19b13dc-lifecycle-emails/source/email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |
| `staged/a41a3029-lifecycle-emails/source/email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | contains email addresses other than hello@romrx.io, reid@romrx.io, or user@example.com; standing evidence rule |

That is why Vera, checking out evidence commit `a23aed1d`, saw 8 of 10 files under `rollback/live-lifecycle-emails-v3/` (the two missing were `source/index.ts` and `source/email.ts`) and could not read 6 of the 53 `SHA256SUMS-v2` entries. On disk, all 10 live-v3 rollback files are present, and `sha256sum -c SHA256SUMS-v2` is clean.

The two combined diffs vs `b19b13dc` and the b19b13dc / staged `email.ts` copies are the other four of the six. They are also on disk at the paths above.
