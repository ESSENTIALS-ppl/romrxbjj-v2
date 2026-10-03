Run (from this folder):
  for t in rule base_norms decisions; do npx esbuild test/$t.test.ts --bundle --platform=node --format=esm --outfile=/tmp/$t.test.mjs && node /tmp/$t.test.mjs; done
Each prints "ok" lines (base_norms.test.ts prints four: norms, hip move + ankle unit, sex-missing policy; decisions prints two). Strict type check of the pure modules:
  npx -p typescript tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --types "" base_norms.ts rule.ts pack_rating.ts
PENDING JIM constants (each one switch): HIP_FLEX_GRADING_MODE, HIP_FLEX_SEX_MISSING_POLICY, HIP_FLEX_ABOVE_REVIEW_HANDLING, HIP_FLEX_MOVES_USE_SLR_COLOR, ONE_SIDE_MISSING_POLICY, GREY_BEATS_YELLOW, PACK_PERCENT_MODE, ANKLE cm edges (PROPOSED).
