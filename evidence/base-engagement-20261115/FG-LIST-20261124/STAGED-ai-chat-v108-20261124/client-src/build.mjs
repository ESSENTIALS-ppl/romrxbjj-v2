// Run: ESBUILD_JS=<path to esbuild package main> node build.mjs   (esbuild 0.28.2)
import path from "node:path"; import { createRequire } from "node:module";
const here = path.dirname(new URL(import.meta.url).pathname);
const esbuild = createRequire(import.meta.url)(process.env.ESBUILD_JS ?? "/tmp/r10b-rebuild-20261124/src/app/node_modules/esbuild");
const stubs = { name: "stubs", setup(b) {
  b.onResolve({ filter: /^react$/ }, () => ({ path: path.join(here, "stubs/react.js") }));
  b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: path.join(here, "stubs/supabase.js") }));
} };
await esbuild.build({ entryPoints: [path.join(here, "score_entry.ts")], bundle: true, format: "esm", platform: "neutral", target: "es2022",
  legalComments: "none", plugins: [stubs], outfile: process.argv[2] ?? path.join(here, "../source/ai-chat/mobility_score.js"),
  banner: { js: "// GENERATED from client-src/score_entry.ts (romrx-io-web tag frozen-20261124/fg-08-mybody-progress-v2, 311538a1). Do not edit." } });
