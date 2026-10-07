import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jointPercents, mobilityScore, overallBandScore } from "../email.ts";

// Stacy (Oct 4): no hip_flex row / 120 target in the email scoring at all, and the band 3 line has no "protect what you have".
const src = readFileSync(new URL("../email.ts", import.meta.url), "utf8");
assert.ok(!/key:\s*"hip_flex"/.test(src), "hip_flex row must not exist in BAND_JOINTS");
assert.ok(!/target:\s*120/.test(src), "no 120 target");
assert.ok(!/protect what you have/i.test(src));
assert.ok(src.includes("Solid mobility foundation. Continue to your dashboard to keep training and retest regularly."));
// Average man: straight-leg raise 68. The old 120 target made it a Needs focus joint (57%) and dragged the /100.
// every scored joint exactly at its Steady target (hip ER 29 / IR 26 / abduction 40 since Oct 6 2026; were 45 / 45 / 90)
const base = { hip_er_l: 29, hip_er_r: 29, hip_ir_l: 26, hip_ir_r: 26, hip_abd_l: 40, hip_abd_r: 40, shoulder_er_l: 85, shoulder_er_r: 85 };   // shoulder ER 85 since Oct 6 2026 8:19 PM (standing goal-post; was 40, 90 before)
const withHip = { ...base, hip_flex_l: 68, hip_flex_r: 68 };

// no per-joint % or band for hip flexion
assert.equal(jointPercents(withHip).hip_flex, undefined);
// every other joint is still scored
assert.deepEqual(Object.keys(jointPercents(withHip)).sort(), ["hip_abd", "hip_er", "hip_ir", "shoulder_er"]);
// all scored joints Steady -> overall Steady, 100/100; hip flexion at 68 cannot pull it down to Needs focus
assert.equal(overallBandScore(withHip), 3);
assert.equal(mobilityScore(withHip), 100);
// the hip flexion reading never changes the result (0, 68, 120 or absent)
for (const v of [0, 30, 68, 120, 150]) {
  assert.equal(mobilityScore({ ...base, hip_flex_l: v, hip_flex_r: v }), mobilityScore(base), `hip_flex ${v}`);
  assert.equal(overallBandScore({ ...base, hip_flex_l: v, hip_flex_r: v }), overallBandScore(base), `hip_flex ${v}`);
}
// only hip flexion measured: nothing scoreable (null, not a score from the 120 target)
assert.equal(mobilityScore({ hip_flex_l: 68, hip_flex_r: 68 }), null);
assert.equal(overallBandScore({ hip_flex_l: 68, hip_flex_r: 68 }), null);
// a genuinely low scored joint still drives the band as before
assert.equal(overallBandScore({ ...withHip, hip_abd_l: 30, hip_abd_r: 30 }), 1); // 30 / 40 (Oct 6 target) = 0.75
console.log("submit-lead-assessment hip_flex_unscored tests: ok");
