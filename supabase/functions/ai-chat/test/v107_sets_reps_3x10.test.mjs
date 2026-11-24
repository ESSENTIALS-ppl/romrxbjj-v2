// Run: node supabase/functions/ai-chat/test/v107_sets_reps_3x10.test.mjs
// Jim L997 (Nov 3 2026): "Yes, change ROMBot to say 3 sets of 10 for everyone." v107 restores v105's Base protocol lines exactly.
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
const here = path.dirname(new URL(import.meta.url).pathname); const root = path.resolve(here, "..");
const fx = JSON.parse(fs.readFileSync(path.join(here, "fixture-ebfe4f3d-protocol.json"), "utf8"));
globalThis.Deno = { env: { get: () => undefined } };
async function load(dir, tag) {
  let src = fs.readFileSync(path.join(dir, "handler.js"), "utf8");
  src = src.replace(/^import .*"\.\/mobility_score\.js";$/m, `import { mobilityScoreForAssessment, mobilityRawScoreForAssessment, gateAssessment, gateJointScores, setHipFlexScoredAtMs } from ${JSON.stringify(pathToFileURL(path.join(dir, "mobility_score.js")).href)};`)
    .replace(/^import .*(jsr:|romood_chat).*$/gm, "");
  const tmp = path.join(os.tmpdir(), `h_${tag}_${process.pid}.mjs`); fs.writeFileSync(tmp, src);
  const m = await import(pathToFileURL(tmp).href); fs.unlinkSync(tmp); return m;
}
const v107 = await load(root, "v107");
const v105 = await load(path.join(here, "v105-pin"), "v105");
const v106 = await load(path.join(here, "v106-pin"), "v106");
const block = (p) => p.split("## Priority mobility protocol\n")[1].split("\n## ")[0].replace(/\n+$/, "");
const ctx = (h) => h.allowListContext({ full_name: "Test", worst_joints: fx.worst_joints, protocol: fx.protocol, joint_scores: [] });
const p107 = v107.CBase({ ...ctx(v107), today_dow: 2 });
const p105 = v105.CBase({ ...ctx(v105), today_dow: 2 });
// Whole Base protocol block identical to v105 (rep lines 3 sets of 10, timed lines keep their time).
assert.equal(block(p107), block(p105), "Base protocol block == v105");
assert.match(block(p107), /^  shoulder_er: Band Face Pull with External Rotation - 3 sets of 10 \(/m, "Tuesday face pull = 3 sets of 10");
assert.match(block(p107), /^  shoulder_er: Doorway Pec Stretch - 30 sec, 3-5 sets daily \(90-150 sec total\) \(/m, "timed line keeps its time");
assert.match(block(p107), /^  shoulder_er: Posterior Shoulder\/Infraspinatus Release with Ball - 60-90 sec each side \(/m);
assert.ok(!/3 sets x 12-15/.test(p107)); assert.ok(!/Sets and reps rule/.test(p107), "v106 dose instruction removed");
assert.match(block(v106.CBase({ ...ctx(v106), today_dow: 2 })), /3 sets x 12-15 reps/, "sanity: v106 had the card dose");
// Null reps -> 3 sets of 10; a timed hold keeps its time; same as v105.
const odd = [{ joint: "x", exercise: "Y", sets: 3, reps: null, cue: "c" }, { joint: "x", exercise: "Z", sets: null, reps: "45 sec hold", cue: "c" }, { joint: "x", exercise: "W", sets: 2, reps: "8-10 reps each side", cue: "c" }];
const q107 = block(v107.CBase({ full_name: "T", worst_joints: ["hip_er_l"], protocol: odd, joint_scores: [] }));
const q105 = block(v105.CBase({ full_name: "T", worst_joints: ["hip_er_l"], protocol: odd, joint_scores: [] }));
assert.equal(q107, q105);
assert.match(q107, /x: Y - 3 sets of 10 \(c\)/); assert.match(q107, /x: Z - 45 sec hold \(c\)/); assert.match(q107, /x: W - 3 sets of 10 \(c\)/);
console.log("v107_sets_reps_3x10: all pass; Tuesday face pull = 3 sets of 10; protocol block == v105");
