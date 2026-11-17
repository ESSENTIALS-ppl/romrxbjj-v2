# P1-25 v5.2: files kept on disk only (evidence address rule), 2026-11-16 ET

These contain email addresses other than hello@romrx.io, reid@romrx.io or user@example.com (example.com test addresses in the PGlite fixtures included in the whole-range backend patch, commit author headers, and the Privacy Policy contact address in legal.html context). They stay on disk in /workspace/process/batches/base-engagement-20261115/P1-25-purge-20261116/ and are NOT committed to evidence/receipts-rebuilt-20261115. Hashes are in SHA256SUMS-v5.2. v5 and v5.1 held-back files and SUMS were not edited.

- `1c3f1d82-82597b57.patch` (git format-patch of 1c3f1d82..82597b57, whole v5 through v5.2 change): 5035ec0ca5911bbb15818a2d6109956e41aa23e2982f2cf815048093cc197afc
- `29eb4fa6-39b79d69.patch` (git format-patch of romrx-io-web 29eb4fa6..39b79d69): d2b8bfa6e7ca5a816a9d98c781ea0787d6714cb7409a27f3320ce87a783e35c2
- `7e8190ae-legal.html.patch` (v5.1 web commit, already held): c1c28106e983902b985ec7340874e940af33d8644e66f8d37ed6cdffff7dfd6a
- `test-v5.mjs` (same bytes as v5): 78858d48a5696fe94da3cff67e445098379088e9e99a05001645a615bca770eb
- `06c604d4-24508e01.patch` (already held): f872896701d6f3d0f38c36f1656ef6821ecbb9ffef6fe3a77eca6081e2a134ba
- `1c3f1d82-c3e04415.patch` (v5.1 range, already held): 8b7f21493aa4bbc6b7997bcc4e49c574e3a368a504534fe69cd56e4e80d954b5

The backend bytes are in romrxbjj-v2 commits 06c604d4, 24508e01, c3e04415 and 82597b57 on feat/p1-25-purge-v5-20261116. The legal.html sentence is in romrx-io-web commits 7e8190ae and 39b79d69 on feat/p1-25-purge-privacy-line-20261116.
