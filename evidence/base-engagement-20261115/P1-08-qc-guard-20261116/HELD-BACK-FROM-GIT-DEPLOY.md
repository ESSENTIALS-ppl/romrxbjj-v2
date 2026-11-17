# Held back from git evidence (P1-08 QC-guard DRY deploy, Nov 16 2026)

These four files are on disk in `deploy-20261116/` but are not committed to the evidence branch: each contains email addresses other than hello@romrx.io, reid@romrx.io or user@example.com (standing evidence rule). Addresses are not printed here. Each is byte-identical to the git blob at romrxbjj-v2 fb53b850, so anyone can recheck with `git show fb53b850:supabase/functions/lifecycle-emails/<path> | sha256sum`.

| path | sha256 |
|---|---|
| `deploy-20261116/fb53b850-bytes/lifecycle-emails/source/index.ts` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` |
| `deploy-20261116/fb53b850-bytes/lifecycle-emails/source/email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` |
| `deploy-20261116/readback-lifecycle-emails-v4/source__index.ts` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` |
| `deploy-20261116/readback-lifecycle-emails-v4/source__email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` |
