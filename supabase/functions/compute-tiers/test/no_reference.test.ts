import assert from "node:assert/strict";
import { buildRequirements, classifyMove, NO_REFERENCE_RANGE_SWITCH, HIP_ER_NO_REFERENCE_MIN, isNoReferenceBar } from "../rule.ts";

// Legal (Stacy, STACY-CLEARANCES section 10): a bar far above the healthy average stays GREY, reason no_reference_range,
// until Quinn answers Q4 / Q5. Hip external rotation bars of 50 or more (57 BJJ techniques).
assert.equal(NO_REFERENCE_RANGE_SWITCH, true);   // default ON
assert.equal(HIP_ER_NO_REFERENCE_MIN, 50);
const M = (rows: [string, number, string?][]) => buildRequirements(rows.map(([joint, v, l]) => ({ joint, required_value: v, laterality_rule: l ?? "BOTH" })));
const healthy = { hip_er_l: 36, hip_er_r: 36, hip_abd_l: 60, hip_abd_r: 60 };   // healthy seated average is about 36 degrees

// every bar from 50 up is GREY / no_reference_range, whatever the athlete measured (even 90 degrees: never GREEN)
for (const bar of [50, 55, 60, 65, 70]) {
  for (const val of [10, 36, 49, 50, 90]) {
    const r = classifyMove({ hip_er_l: val, hip_er_r: val }, M([["Hip ER", bar]]));
    assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"], `bar ${bar} val ${val}`);
    assert.equal(r.joint_status[0].status, "GREY");
    assert.deepEqual(r.limiting, ["hip_er:no_reference_range"]);
  }
}
// bars under 50 are graded normally (40 and 45 exist in the matrix)
assert.equal(classifyMove(healthy, M([["Hip ER", 40]])).tier, "YELLOW");   // 36 vs 40 = 4 below
assert.equal(classifyMove(healthy, M([["Hip ER", 45]])).tier, "YELLOW");   // 9 below
assert.equal(classifyMove(healthy, M([["Hip ER", 30]])).tier, "GREEN");
assert.equal(classifyMove({ hip_er_l: 20, hip_er_r: 20 }, M([["Hip ER", 45]])).tier, "RED");
assert.equal(isNoReferenceBar("hip_er", 49.9), false);
assert.equal(isNoReferenceBar("hip_er", 50), true);
assert.equal(isNoReferenceBar("hip_ir", 80), false);                       // only hip external rotation
// legacy techniques.hip_er_min carries the same numbers and gets the same treatment
let r = classifyMove(healthy, buildRequirements([], { hip_er_min: 55, hip_abd_min: 50 }));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
assert.equal(r.joint_status.find(j => j.joint === "hip_abd")!.status, "GREEN");
// two matrix rows (LEAD 45, TRAIL 55): the stricter row (55) applies, so the joint is GREY
r = classifyMove(healthy, M([["Hip ER", 45, "LEAD"], ["Hip ER", 55, "TRAIL"]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
// a real RED on another joint still wins (never hidden by the grey joint), and is not labelled no_reference_range
r = classifyMove(healthy, M([["Hip ER", 55], ["Hip Abduction", 90]]));
assert.deepEqual([r.tier, r.grey_reason], ["RED", null]);
assert.deepEqual(r.joint_status.map(j => j.status), ["GREY", "RED"]);
// the other joints are still graded and kept in joint_status; the move is GREY, never GREEN
r = classifyMove(healthy, M([["Hip ER", 55], ["Hip Abduction", 50]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
assert.deepEqual(r.joint_status.map(j => j.status), ["GREY", "GREEN"]);
// YELLOW elsewhere + no-reference joint = GREY while GREY_BEATS_YELLOW (default)
r = classifyMove(healthy, M([["Hip ER", 55], ["Hip Abduction", 65]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
// no_reference_range takes the label over incomplete when both apply (an unmeasured joint too)
r = classifyMove(healthy, M([["Hip ER", 55], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
// unmeasured hip rotation with a 55 bar: still no_reference_range (the bar, not the reading, is the reason)
r = classifyMove({}, M([["Hip ER", 55]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
// without the hip rule an unmeasured joint stays "incomplete"
r = classifyMove({}, M([["Hip ER", 40]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "incomplete"]);
// ankle legacy degree path uses the same label; a cm requirement is compared normally
r = classifyMove({ ankle_df_l: 11, ankle_df_r: 11 }, M([["Ankle DF", 15]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
assert.equal(classifyMove({ ankle_df_l: 11, ankle_df_r: 11 }, M([["Ankle DF (cm)", 10]])).tier, "GREEN");
// no rule is still no_rule
assert.deepEqual([classifyMove(healthy, []).tier, classifyMove(healthy, []).grey_reason], ["GREY", "no_rule"]);
console.log("compute-tiers no_reference_range tests: ok");
