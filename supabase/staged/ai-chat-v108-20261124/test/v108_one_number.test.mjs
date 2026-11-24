// Run from this folder: node test/v108_one_number.test.mjs
// One number everywhere: chip, Body score row and ROMBot use bodyScoreChange from romrx-io-web tag fg-08-mybody-progress-v2.
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url"; import { createRequire } from "node:module";
const here = path.dirname(new URL(import.meta.url).pathname); const root = path.resolve(here, "..");
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d.json"), "utf8"));
const pr = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d-protocol.json"), "utf8"));
const cutMs = Date.parse(fx.cut); const hipIds = new Set(fx.hipIds ?? []);
const firstRow = [...fx.rows].sort((a, b) => Date.parse(a.assessed_at) - Date.parse(b.assessed_at))[0];
// 1. Client (tag code, compiled with the same stub plugin as the build).
const esbuild = createRequire(import.meta.url)(process.env.ESBUILD_JS ?? "/tmp/r10b-rebuild-20261124/src/app/node_modules/esbuild");
const stubs = { name: "stubs", setup(b) { b.onResolve({ filter: /^react$/ }, () => ({ path: path.join(root, "client-src/stubs/react.js") })); b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: path.join(root, "client-src/stubs/supabase.js") })); } };
const cOut = path.join(os.tmpdir(), `v108_client_${process.pid}.mjs`);
await esbuild.build({ entryPoints: [path.join(here, "client_mybody_tag_entry.ts")], bundle: true, format: "esm", platform: "neutral", outfile: cOut, logLevel: "error", plugins: [stubs] });
const client = (await import(pathToFileURL(cOut).href)).myBody(fx.rows, fx.latestScores, cutMs, hipIds, firstRow); fs.unlinkSync(cOut);
assert.equal(client.dial, 89); assert.equal(client.chip, 4); assert.equal(client.bodyScoreRow, 10);
// 2. Server (v108 handler + mobility_score.js built from the tag).
globalThis.Deno = { env: { get: () => undefined } };
async function load(dir, tag) {
  const src = fs.readFileSync(path.join(dir, "handler.js"), "utf8")
    .replace(/^(import \{[^}]*\} from )"\.\/mobility_score\.js";$/m, (_, a) => `${a}${JSON.stringify(pathToFileURL(path.join(dir, "mobility_score.js")).href)};`)
    .replace(/^import .*(jsr:|romood_chat).*$/gm, "");
  const tmp = path.join(os.tmpdir(), `h_${tag}_${process.pid}.mjs`); fs.writeFileSync(tmp, src); const m = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp); return m;
}
const h = await load(path.join(root, "source/ai-chat"), "v108");
const v107 = await load(path.resolve(root, "../../functions/ai-chat"), "v107");
const sc = h.computeDisplayScores(fx.rows, fx.latestScores, cutMs, hipIds, firstRow);
assert.equal(sc.dial, client.dial, "dial"); assert.equal(sc.change, client.chip, "ROMBot since-previous == chip");
assert.equal(sc.changeSinceFirst, client.bodyScoreRow, "ROMBot since-first == Body score row");
assert.equal(sc.previousAt, client.previousAt); assert.equal(sc.firstAt, client.startedAt);
// Fallback when the first-assessment read fails: oldest loaded (client does the same).
const sc2 = h.computeDisplayScores(fx.rows, fx.latestScores, cutMs, hipIds, null);
assert.equal(sc2.changeSinceFirst, (await (async () => { const o = path.join(os.tmpdir(), `v108_c2_${process.pid}.mjs`); await esbuild.build({ entryPoints: [path.join(here, "client_mybody_tag_entry.ts")], bundle: true, format: "esm", platform: "neutral", outfile: o, logLevel: "error", plugins: [stubs] }); const m = await import(pathToFileURL(o).href); fs.unlinkSync(o); return m.myBody(fx.rows, fx.latestScores, cutMs, hipIds, null).bodyScoreRow; })()));
// v107 change number unchanged (raw - raw == bodyScoreChange).
const s107 = v107.computeDisplayScores(fx.rows, fx.latestScores, cutMs, hipIds);
assert.equal(s107.change, sc.change); assert.equal(s107.dial, sc.dial);
// 3. Prompt labels; raw rom_total and its +5 never appear.
const base = { full_name: "Test", worst_joints: pr.worst_joints, protocol: pr.protocol, joint_scores: fx.latestScores.map(r => ({ joint: r.joint_key, score: r.score, left: r.left_value, right: r.right_value })), rom_total: 94 };
const p = h.CBase({ ...base, display_scores: sc, score_tz: "America/New_York", today_dow: 2 });
assert.match(p, /Overall ROM score: 89\/100/);
assert.match(p, /Change since previous assessment \(Nov 10 to latest\): \+4 \(same as the "vs Nov 10" change next to the Body score in the app\)/);
assert.match(p, /Change since first assessment \(Oct 4 to latest\): \+10 \(same as the Body score row in "Where you started \/ Where you are now" in the app\)/);
assert.ok(!/\b94\b/.test(p) && !/\+5\b/.test(p), "rom_total 94 and +5 never in the prompt");
// Two assessments only: first == previous -> one line.
const two = h.computeDisplayScores(fx.rows.slice(0, 2), fx.latestScores, cutMs, hipIds, fx.rows[1]);
assert.equal(h.formatScoreChange(two, "America/New_York").split("\n").length, 1);
// History lines (flag path) use the same function.
const hs = h.formatAssessmentHistory(base.joint_scores, fx.rows.slice(1).map(a => ({ id: a.id, assessed_at: a.assessed_at, rom_total: 1, joint_scores: [{ joint_key: "hip_er", score: 3, left_value: 50, right_value: 49 }] })), 94, sc);
assert.match(hs, /2026-11-10 \(Overall ROM score 89\/100, \+4 to latest\)/); assert.match(hs, /2026-10-04 \(Overall ROM score 83\/100, \+10 to latest\)/);
// 4. Item 1: Tuesday block unchanged from v107 (full doorway string) + dose rule present.
const blk = (q) => q.split("## Priority mobility protocol\n")[1].split("\nDose rule:")[0].split("\n## ")[0].replace(/\n+$/, "");
const p107 = v107.CBase({ ...base, display_scores: s107, score_tz: "America/New_York", today_dow: 2 });
assert.equal(blk(p), blk(p107), "protocol lines identical to v107/v105");
assert.match(blk(p), /^  shoulder_er: Doorway Pec Stretch - 30 sec, 3-5 sets daily \(90-150 sec total\) \(/m);
assert.match(blk(p), /^  shoulder_er: Band Face Pull with External Rotation - 3 sets of 10 \(/m);
assert.match(p, /\nDose rule: a timed or hold dose \(seconds, minutes, holds\) is quoted exactly as written in its line above, word for word, including anything in parentheses \(for example "30 sec, 3-5 sets daily \(90-150 sec total\)"\)\. Do not shorten, round or reword it\. Rep-based lines stay "3 sets of 10"\./);
console.log(`v108_one_number: all pass; dial ${sc.dial}; since previous ${sc.change} (= chip ${client.chip}); since first ${sc.changeSinceFirst} (= Body score row ${client.bodyScoreRow}); no 94/+5; doorway full string + dose rule`);
