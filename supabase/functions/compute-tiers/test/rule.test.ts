import assert from "node:assert/strict";
import { buildRequirements, classifyMove, classifyJoint, normalizeJoint, ANKLE_LEGACY_REQUIREMENTS_ARE_CM, GREY_BEATS_YELLOW } from "../rule.ts";

const A = { hip_flex_l: 120, hip_flex_r: 100, hip_abd_l: 60, hip_abd_r: 60, lumbar_flex: 50, shoulder_flex_l: 170, shoulder_flex_r: 170 };
const M = (rows: [string, number, string?][]) => buildRequirements(rows.map(([joint, v, l]) => ({ joint, required_value: v, laterality_rule: l ?? "BOTH" })));

// worst-side + worst-joint
let r = classifyMove(A, M([["Hip Flexion", 100], ["Hip Abduction", 50]]));
assert.equal(r.tier, "GREEN");
r = classifyMove(A, M([["Hip Flexion", 110], ["Hip Abduction", 50]]));   // 100 vs 110 = 10 below -> YELLOW (flat 10)
assert.equal(r.tier, "YELLOW");
r = classifyMove(A, M([["Hip Flexion", 125], ["Hip Abduction", 50], ["Lumbar Flexion", 45, "MIDLINE"]])); // 25 below -> RED
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
// RED still beats GREY; YELLOW + unmeasured = GREY while GREY_BEATS_YELLOW (PENDING JIM, default true)
assert.equal(GREY_BEATS_YELLOW, true);
r = classifyMove(A, M([["Hip Flexion", 125], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.equal(r.tier, "RED");
r = classifyMove(A, M([["Hip Flexion", 110], ["Cervical Rotation", 60, "MIDLINE"]]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "incomplete"]);
assert.deepEqual(r.joint_status.map(j => j.status).sort(), ["GREY", "YELLOW"]);   // the measured YELLOW is still in joint_status
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

// F-17: a cm ankle reading is never compared to a unit-less (degrees-style) requirement
assert.equal(ANKLE_LEGACY_REQUIREMENTS_ARE_CM, false);
const AK = { ankle_df_l: 12, ankle_df_r: 11, hip_abd_l: 60, hip_abd_r: 60 };
r = classifyMove(AK, M([["Ankle DF", 15]]));                                   // 12 cm vs "15" would have been RED
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "incomplete"]);
assert.deepEqual(r.limiting, ["ankle_df:cm_requirement_pending"]);
r = classifyMove(AK, buildRequirements([], { ankle_df_min: 20, hip_abd_min: 50 })); // legacy techniques column: same
assert.equal(r.joint_status.find(j => j.joint === "ankle_df")!.status, "GREY");
assert.equal(r.joint_status.find(j => j.joint === "hip_abd")!.status, "GREEN");
assert.equal(r.tier, "GREY");
// pending ankle never hides a real RED on another joint, and never produces GREEN
r = classifyMove(AK, M([["Ankle DF", 15], ["Hip Abduction", 90]]));
assert.equal(r.tier, "RED");
// explicit cm requirement is compared in cm and replaces the legacy ankle row
r = classifyMove(AK, M([["Ankle DF", 20], ["Ankle DF (cm)", 10]]));
assert.equal(r.tier, "GREEN");
r = classifyMove(AK, M([["Ankle DF (cm)", 13]]));                               // 11 vs 13 = 2 cm below -> YELLOW (flat 2 cm, decision #4)
assert.equal(r.tier, "YELLOW");
r = classifyMove(AK, M([["Ankle DF (cm)", 14]]));                               // 3 cm below -> RED
assert.equal(r.tier, "RED");
r = classifyMove(AK, M([["ankle_df_cm", 12]]));                                 // 1 cm below -> YELLOW
assert.equal(r.tier, "YELLOW");
r = classifyMove(AK, buildRequirements([], { ankle_df_min: 20, ankle_df_cm_min: 10 })); // cm column beats legacy
assert.equal(r.tier, "GREEN");
assert.equal(classifyMove({}, M([["Ankle DF (cm)", 10]])).tier, "GREY");        // unmeasured stays GREY
assert.equal(normalizeJoint("Ankle DF (cm)"), "ankle_df_cm");
console.log("compute-tiers rule tests: ok");
