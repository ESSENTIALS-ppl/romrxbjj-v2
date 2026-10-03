import assert from "node:assert/strict";
import { HIP_FLEX_UNSCORED, isUnscoredJoint, romTotal, worstJointKeys } from "../joint_totals.ts";

// Same shape as JOINT_TARGETS in index.ts (hip_flex_l / hip_flex_r at 120 is the old, unreachable target).
const T: Record<string, number> = {
  hip_er_l: 45, hip_er_r: 45, hip_abd_l: 90, hip_abd_r: 90, hip_flex_l: 120, hip_flex_r: 120,
  shoulder_er_l: 90, shoulder_er_r: 90, lumbar_flex: 60, lumbar_ext: 25,
};
const toNum = (v: unknown): number | null => (v == null ? null : isFinite(Number(v)) ? Number(v) : null);

assert.equal(HIP_FLEX_UNSCORED, true);   // default ON
assert.equal(isUnscoredJoint("hip_flex"), true);
assert.equal(isUnscoredJoint("hip_flex_l"), true);
assert.equal(isUnscoredJoint("hip_flex_r"), true);
assert.equal(isUnscoredJoint("hip_abd_l"), false);
assert.equal(isUnscoredJoint("hip_ext_l"), false);

// An average man: straight-leg raise about 68 deg (57% of 120) would be the single worst joint under the old rule.
const man: Record<string, number> = { hip_er_l: 40, hip_er_r: 40, hip_abd_l: 80, hip_abd_r: 80, hip_flex_l: 68, hip_flex_r: 68, shoulder_er_l: 85, shoulder_er_r: 85, lumbar_flex: 55, lumbar_ext: 22 };
const worst = worstJointKeys(man, T, toNum, 5);
assert.ok(!worst.some(k => k.startsWith("hip_flex")), `hip flexion must never be a weak spot: ${worst}`);
assert.equal(worst.length, 5);                       // the limit is still filled from scored joints

// /100: hip flexion is not in the average. Scored joints only: mean of the other 8 values.
const others = ["hip_er_l", "hip_er_r", "hip_abd_l", "hip_abd_r", "shoulder_er_l", "shoulder_er_r", "lumbar_flex", "lumbar_ext"];
const expected = Math.round(others.reduce((s, k) => s + Math.min(1, man[k] / T[k]) * 100, 0) / others.length);
assert.equal(romTotal(man, T, toNum), expected);
// the hip flexion value does not move the total or the weak spots at all (68 vs 120 vs 0 vs missing)
for (const v of [0, 30, 68, 120, 150, null]) {
  assert.equal(romTotal({ ...man, hip_flex_l: v, hip_flex_r: v } as Record<string, unknown>, T, toNum), expected, `hip_flex ${v}`);
  assert.deepEqual(worstJointKeys({ ...man, hip_flex_l: v, hip_flex_r: v } as Record<string, unknown>, T, toNum, 5), worst, `hip_flex ${v}`);
}
// only hip flexion measured: nothing scored (0, no weak spots), never a fake score from the 120 target
assert.equal(romTotal({ hip_flex_l: 68, hip_flex_r: 68 }, T, toNum), 0);
assert.deepEqual(worstJointKeys({ hip_flex_l: 68, hip_flex_r: 68 }, T, toNum), []);
// other joints behave exactly as before (worst first, ratio capped at 1)
assert.deepEqual(worstJointKeys({ hip_er_l: 10, hip_abd_l: 90, lumbar_flex: 30 }, T, toNum, 2), ["hip_er_l", "lumbar_flex"]);
assert.equal(romTotal({ hip_er_l: 45, hip_abd_l: 45 }, T, toNum), 75);
console.log("compute-tiers hip_flex_unscored tests: ok");
