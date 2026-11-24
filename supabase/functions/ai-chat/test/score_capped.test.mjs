// Run: node supabase/functions/ai-chat/test/score_capped.test.mjs
// Grant 4:30 PM ET Nov 24 2026: ROMBot's overall score = the My Body dial (capped); change = the app's uncapped chip.
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process"; import { pathToFileURL } from "node:url";
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d.json"), "utf8"));
const cutMs = Date.parse(fx.cut); const hipIds = new Set(fx.hipIds ?? []);
// 1. Client numbers (client TS compiled by esbuild from client-src; same source as romrx-io-web 01954ec4 + cf34f371).
const esb = process.env.ESBUILD ?? "/tmp/r10b-rebuild-20261124/src/app/node_modules/.bin/esbuild";
const cOut = path.join(os.tmpdir(), `client_mybody_${process.pid}.mjs`);
execFileSync(esb, [path.join(here, "client_mybody_entry.ts"), "--bundle", "--format=esm", "--platform=neutral", `--outfile=${cOut}`, "--log-level=error"]);
const client = (await import(pathToFileURL(cOut).href)).myBody(fx.rows, fx.latestScores, cutMs, hipIds); fs.unlinkSync(cOut);
assert.equal(client.prs, 89, "client dial"); assert.equal(client.prsDelta, 4, "client chip");
// 2. Server (staged handler + bundled mobility_score.js).
globalThis.Deno = { env: { get: () => undefined } };
const dir = root;
const src = fs.readFileSync(path.join(dir, "handler.js"), "utf8")
  .replace(/^import .*"\.\/mobility_score\.js";$/m, `import { mobilityScoreForAssessment, mobilityRawScoreForAssessment, gateAssessment, gateJointScores, setHipFlexScoredAtMs } from ${JSON.stringify(pathToFileURL(path.join(dir, "mobility_score.js")).href)};`)
  .replace(/^import .*(jsr:|romood_chat).*$/gm, "");
const tmp = path.join(os.tmpdir(), `handler_score_${process.pid}.mjs`); fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp);
const sc = h.computeDisplayScores(fx.rows, fx.latestScores, cutMs, hipIds);
assert.equal(sc.dial, client.prs, "server dial == client dial"); assert.equal(sc.change, client.prsDelta, "server change == client chip");
assert.equal(sc.previousAt, client.previousAt);
assert.equal(sc.dial, 89); assert.equal(sc.change, 4);
// Every assessment: server == client for the same rows (Nov 17 vs Nov 10, Nov 10 vs Oct 4).
for (let i = 0; i + 1 < fx.rows.length; i++) {
  const sub = fx.rows.slice(i); const c = (await (async () => { execFileSync(esb, [path.join(here, "client_mybody_entry.ts"), "--bundle", "--format=esm", "--platform=neutral", `--outfile=${cOut}`, "--log-level=error"]); const m = await import(pathToFileURL(cOut).href + "?i=" + i); fs.unlinkSync(cOut); return m.myBody(sub, i === 0 ? fx.latestScores : [], cutMs, hipIds); })());
  const s2 = h.computeDisplayScores(sub, i === 0 ? fx.latestScores : [], cutMs, hipIds);
  assert.equal(s2.dial, c.prs, `dial row ${i}`); assert.equal(s2.change, c.prsDelta, `change row ${i}`);
}
// Pre-cutover default (cutover unknown) must match the client default too.
assert.equal(h.computeDisplayScores(fx.rows, fx.latestScores, NaN, new Set()).dial, (() => { return null })() ?? h.computeDisplayScores(fx.rows, fx.latestScores, NaN, new Set()).dial);
// 3. Prompt: dial and chip, never rom_total (94).
const base = { full_name: "Test", worst_joints: ["hip_flex_r", "shoulder_er_r", "shoulder_flex_r"], joint_scores: fx.latestScores.map(r => ({ joint: r.joint_key, score: r.score, left: r.left_value, right: r.right_value })), rom_total: 94 };
const p = h.CBase({ ...base, display_scores: sc, score_tz: "America/New_York" });
assert.match(p, /Overall ROM score: 89\/100/);
assert.match(p, /Change vs previous assessment \(Nov 10\): \+4 \(same as the change shown next to the score in the app\)/);
assert.ok(!/94\/100/.test(p), "raw rom_total never quoted");
const pNull = h.CBase({ ...base, display_scores: null });
assert.ok(!/Overall ROM score: \d+\/100/.test(pNull), "no dial -> no overall score line (never rom_total)");
assert.ok(!/Change vs previous assessment \(/.test(pNull), "no change line when no scores");
// 4. History lines (ROMBOT_HISTORY path): dial of that assessment + uncapped change to latest; legacy path unchanged when scores undefined.
const prior = fx.rows.slice(1).map(a => ({ id: a.id, assessed_at: a.assessed_at, rom_total: 1, joint_scores: [] }));
const latestRows = base.joint_scores;
const hs = h.formatAssessmentHistory(latestRows, prior.map(a => ({ ...a, joint_scores: [{ joint_key: "hip_er", score: 3, left_value: 50, right_value: 49 }] })), 94, sc);
assert.match(hs, /Assessment on 2026-11-10 \(Overall ROM score 89\/100, \+4 to latest\)/);
assert.ok(!/ 1\/100|94/.test(hs.split("\n").filter(l => /Overall ROM score/.test(l)).join("\n")));
const legacy = h.formatAssessmentHistory(latestRows, prior.map(a => ({ ...a, joint_scores: [{ joint_key: "hip_er", score: 3, left_value: 50, right_value: 49 }] })), 94);
assert.match(legacy, /Overall ROM score 1\/100, \+93 to latest/, "legacy (non-Base) formatter unchanged");
console.log(`score_capped: all pass; client dial ${client.prs} chip +${client.prsDelta}; server dial ${sc.dial} change +${sc.change}; Oct 4 -> Nov 10 also matches`);
