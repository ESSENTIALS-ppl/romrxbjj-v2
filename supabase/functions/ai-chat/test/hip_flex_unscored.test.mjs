// Run: node supabase/functions/ai-chat/test/hip_flex_unscored.test.mjs
// handler.js imports jsr: modules and reads Deno.env at load, so strip the imports and stub Deno before loading it.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

globalThis.Deno = { env: { get: () => undefined } };
const src = fs.readFileSync(new URL("../handler.js", import.meta.url), "utf8").replace(/^import .*$/gm, "");
const tmp = path.join(os.tmpdir(), `handler_under_test_${process.pid}.mjs`);
fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

assert.equal(h.isUnscoredJoint("hip_flex"), true);
assert.equal(h.isUnscoredJoint("hip_flex_l"), true);
assert.equal(h.isUnscoredJoint("hip_abd_l"), false);

// worst_joints: hip flexion is dropped, so the top three problem areas are the next three joints
assert.deepEqual(h.scoredOnly(["hip_flex_l", "hip_abd_l", "hip_flex_r", "ankle_df_r", "hip_er_l", "lumbar_ext"]), ["hip_abd_l", "ankle_df_r", "hip_er_l", "lumbar_ext"]);
assert.deepEqual(h.topThreeProblemAreas(h.scoredOnly(["hip_flex_l", "hip_abd_l", "hip_flex_r", "ankle_df_r", "hip_er_l", "lumbar_ext"])), ["hip_abd_l", "ankle_df_r", "hip_er_l"]);
// joint_scores rows: the stored hip_flex "Needs focus" row is ignored
const rows = [{ joint_key: "hip_flex", score: 1 }, { joint_key: "hip_abd", score: 3 }, { joint_key: "ankle_df", score: 2 }];
assert.deepEqual(h.scoredOnly(rows).map(r => r.joint_key), ["hip_abd", "ankle_df"]);
assert.equal(h.overallBandFromJointScores(rows), "Needs focus");                 // raw helper unchanged
assert.equal(h.overallBandFromJointScores(h.scoredOnly(rows)), "Building");       // after the filter
assert.equal(h.scoredOnly(undefined), undefined);                                  // null-safe

// the whole Base prompt never names hip flexion as a weak spot or a Needs focus joint
const prompt = h.CBase({
  full_name: "Test User",
  worst_joints: ["hip_flex_l", "hip_abd_l", "ankle_df_r", "hip_er_l"],
  joint_scores: rows,
  protocol: [],
  saved_game_plans: [],
});
assert.ok(!/hip flexion/i.test(prompt), "prompt must not mention hip flexion");
assert.ok(/Overall mobility band: Building/.test(prompt));
assert.ok(/Needs focus: None listed/.test(prompt));
console.log("ai-chat hip_flex_unscored tests: ok");
