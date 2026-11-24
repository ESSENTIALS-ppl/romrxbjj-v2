// Run: node mybody_check.mjs <commit-or-tag> [repo=/workspace/p1-wt]   Read-only: git archive + local compile, no network.
// Expected on ebfe4f3d: dial 89, chip +4 vs Nov 10 (never -0, never +5), Where you started Oct 4 -> now Nov 17 Body score +10,
// every trend point has a date and a %.
import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { execSync } from "node:child_process"; import { pathToFileURL } from "node:url"; import { createRequire } from "node:module";
const here = path.dirname(new URL(import.meta.url).pathname);
const ref = process.argv[2]; const repo = process.argv[3] ?? "/workspace/p1-wt"; assert.ok(ref, "usage: node mybody_check.mjs <commit-or-tag>");
const commit = execSync(`git -C ${repo} rev-parse ${JSON.stringify(ref + "^{commit}")}`).toString().trim();
const srcDir = path.join(here, "src"); fs.rmSync(srcDir, { recursive: true, force: true }); fs.mkdirSync(srcDir);
execSync(`git -C ${repo} archive ${commit} app/src/lib | tar -x -C ${srcDir}`);
const esbuild = createRequire(import.meta.url)(process.env.ESBUILD_JS ?? "/tmp/r10b-rebuild-20261124/src/app/node_modules/esbuild");
const stubDir = path.join(here, "stubs");
const stubs = { name: "stubs", setup(b) { b.onResolve({ filter: /^react$/ }, () => ({ path: path.join(stubDir, "react.js") })); b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: path.join(stubDir, "supabase.js") })); } };
const out = path.join(os.tmpdir(), `mybody_${process.pid}.mjs`);
await esbuild.build({ entryPoints: [path.join(here, "mybody_entry.ts")], bundle: true, format: "esm", platform: "neutral", outfile: out, logLevel: "error", plugins: [stubs] });
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d.json"), "utf8"));
const rpc = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d-rpcs.json"), "utf8"));
const r = (await import(pathToFileURL(out).href)).myBody(fx, rpc); fs.unlinkSync(out); fs.rmSync(srcDir, { recursive: true, force: true });
console.log(JSON.stringify({ commit, ...r }, null, 1));
assert.equal(r.dial, 89, "dial 89"); assert.equal(r.chip, 4, "chip +4"); assert.equal(r.chipVs, "Nov 10");
assert.ok(r.startedVsNow, "Where you started table present"); assert.equal(r.startedVsNow.started, "Oct 4, 2026"); assert.equal(r.startedVsNow.now, "Nov 17, 2026"); assert.equal(r.startedVsNow.bodyScoreChange, 10);
assert.ok(r.trends.length >= 1, "trend rows"); for (const t of r.trends) for (const p of t.points) assert.match(p, /^[A-Z][a-z]{2} \d{1,2}, 2026 \d+%$/, `dated value ${t.joint}`);
assert.ok(r.trends.every(t => t.points.length === 3), "3 dated points per joint (Oct 4, Nov 10, Nov 17)");
console.log(`MYBODY CHECK PASS on ${commit.slice(0, 8)}: dial ${r.dial}; chip +${r.chip} vs ${r.chipVs}; started ${r.startedVsNow.started} -> now ${r.startedVsNow.now} Body score +${r.startedVsNow.bodyScoreChange}; ${r.trends.length} joint trends with dated values (${r.trendSource})`);
