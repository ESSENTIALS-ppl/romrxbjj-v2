# r10b rebuild check (local only, nothing deployed or published), 2026-11-24 ~4:19 PM ET
- Tag frozen-20261124/r10b-p1-14-push-on-live = 6ac814959d1a (tag object) -> commit 32734361d468c99a16a082f0c14e6b43d5ed128c (matches Jules).
- Source: git archive 32734361 into /tmp/r10b-rebuild-20261124/src; COMMIT_REF = full tip sha; NETLIFY_SITE_ID d9bc6384 (read-only env read).
- `netlify build --context production`: EXIT 0 (24s). VITE_VAPID_PUBLIC_KEY came from the Netlify production env set at 4:13 PM ET (not from the shell); 1 file in app/dist contains the key (count only, key not printed).
- Manifest (all files, excluding node_modules and .netlify, LC_ALL=C path sort): 404 files, sha256 6db20b0592dec4545c541c8cce690bb5e57a8f3c51377a45ffa417910d6915dd = Jules 6db20b05. MATCH. Copy: R10B-REBUILD-MANIFEST-20261124.txt.
- Not published (combined branch with FG-22/23 pending from Jules; WEB_PUSH_SEND untouched).
