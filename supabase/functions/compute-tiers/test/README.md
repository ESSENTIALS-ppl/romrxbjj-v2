Run (from this folder):
  for t in rule base_norms; do npx esbuild test/$t.test.ts --bundle --platform=node --format=esm --outfile=/tmp/$t.test.mjs && node /tmp/$t.test.mjs; done
Both print "ok". Strict type check of the pure modules: npx -p typescript tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --types "" base_norms.ts rule.ts
