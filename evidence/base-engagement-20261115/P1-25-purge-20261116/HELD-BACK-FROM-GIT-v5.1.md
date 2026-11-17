# P1-25 v5.1: files kept on disk only (evidence address rule), 2026-11-16 ET

These contain email addresses other than hello@romrx.io, reid@romrx.io or user@example.com (example.com test addresses in the PGlite fixtures included in the whole-range patch, commit author headers, and a provider-inbox address in legal.html context). They stay on disk in /workspace/process/batches/base-engagement-20261115/P1-25-purge-20261116/ and are NOT committed to evidence/receipts-rebuilt-20261115. Hashes are in SHA256SUMS-v5.1. v5 held-back files and SHA256SUMS-v5 were not edited.

- `1c3f1d82-c3e04415.patch` (git format-patch of 1c3f1d82..c3e04415, whole v5 + v5.1 change): 8b7f21493aa4bbc6b7997bcc4e49c574e3a368a504534fe69cd56e4e80d954b5
- `7e8190ae-legal.html.patch` (git format-patch -1 of romrx-io-web 7e8190ae): c1c28106e983902b985ec7340874e940af33d8644e66f8d37ed6cdffff7dfd6a
- `test-v5.mjs` (PGlite test suite, test data only; same bytes as v5): 78858d48a5696fe94da3cff67e445098379088e9e99a05001645a615bca770eb
- `06c604d4-24508e01.patch` (v5 range, already held in HELD-BACK-FROM-GIT-v5.md): f872896701d6f3d0f38c36f1656ef6821ecbb9ffef6fe3a77eca6081e2a134ba

The backend bytes are in romrxbjj-v2 commits 06c604d4, 24508e01 and c3e04415 on feat/p1-25-purge-v5-20261116. The legal.html sentence is in romrx-io-web commit 7e8190ae on feat/p1-25-purge-privacy-line-20261116.
