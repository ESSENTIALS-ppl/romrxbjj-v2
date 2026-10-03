import assert from "node:assert/strict";
import { buildRequirements, classifyMove, classifyJoint, normalizeJoint } from "../rule.ts";

const A = { hip_flex_l: 120, hip_flex_r: 100, hip_abd_l: 60, hip_abd_r: 60, lumbar_flex: 50, shoulder_flex_l: 170, shoulder_flex_r: 170 };
const M = (rows: [string, number, string?][]) => buildRequirements(rows.map(([joint, v, l]) => ({ joint, required_value: v, laterality_rule: l ?? "BOTH" })));

// worst-side + worst-joint
let r = classifyMove(A, M([["Hip Flexion", 100], ["Hip Abduction", 50]]));
assert.equal(r.tier, "GREEN");
r = classifyMove(A, M([["Hip Flexion", 110], ["Hip Abduction", 50]]));   // 100/110 = 0.909 -> YELLOW
assert.equal(r.tier, "YELLOW");
r = classifyMove(A, M([["Hip Flexion", 125], ["Hip Abduction", 50], ["Lumbar Flexion", 45, "MIDLINE"]])); // 100/125 = 0.8 -> RED
assert.equal(r.tier, "RED");
assert.deepEqual(r.joint_status.map(j => j.status), ["RED", "GREEN", "GREEN"]);
// no rule -> GREY, never GREEN (the 19 moves that used to default GREEN)
r = classifyMove(A, []);
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_rule"]);
// all measured joints GREEN but one unmeasured -> GREY incomplete, never GREEN
r = classifyMove(A, M([["Hip Flexion", 100], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "incomplete"]);
// a joint the app never collects (hip extension) can never produce GREEN
r = classifyMove(A, M([["Hip Flexion", 100], ["Hip Extension", 25]]));
assert.equal(r.tier, "GREY");
// RED / YELLOW still beat GREY (worst MEASURED joint wins)
r = classifyMove(A, M([["Hip Flexion", 125], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.equal(r.tier, "RED");
r = classifyMove(A, M([["Hip Flexion", 110], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.equal(r.tier, "YELLOW");
// ANY laterality uses the better side
r = classifyMove(A, M([["Hip Flexion", 118, "ANY"]]));
assert.equal(r.tier, "GREEN");
// joint_status carries no numbers
assert.ok(!JSON.stringify(classifyMove(A, M([["Hip Flexion", 125]])).joint_status).match(/\d/));
// legacy techniques.*_min only fills gaps; matrix wins
const reqs = buildRequirements([{ joint: "Hip Flexion", required_value: 100 }], { hip_flex_min: 130, lumbar_flex_min: 40, thoracic_min: 9 });
assert.deepEqual(reqs.map(q => [q.joint, q.required]), [["hip_flex", 100], ["lumbar_flex", 40]]);
// unmeasured on both sides
assert.equal(classifyJoint(null, 50), "GREY");
assert.equal(normalizeJoint("shoulder_external_rotation"), "shoulder_er");
console.log("compute-tiers rule tests: ok");
