// Tests for Jim's closed decisions #3, #4, #5, #6 (compute-tiers v43 DRAFT).
import assert from "node:assert/strict";
import {
  buildRequirements, classifyMove, classifyJoint, athleteValue, pickLegStatus, ONE_SIDE_MISSING_POLICY, sideGapNote, normalizeDominant,
  YELLOW_TOLERANCE_DEG, YELLOW_TOLERANCE_ANKLE_CM,
} from "../rule.ts";
import { packRating, packRatingIfEnabled, PACK_PERCENT_MODE, type MoveForRating } from "../pack_rating.ts";

const M = (rows: [string, number, string?][]) => buildRequirements(rows.map(([joint, v, l]) => ({ joint, required_value: v, laterality_rule: l ?? "BOTH" })));

// ---- #4 YELLOW is a flat 10 degrees (ankle 2 cm), not 90% ----
assert.equal(YELLOW_TOLERANCE_DEG, 10);
assert.equal(YELLOW_TOLERANCE_ANKLE_CM, 2);
assert.equal(classifyJoint(100, 100, "hip_abd"), "GREEN");
assert.equal(classifyJoint(99.9, 100, "hip_abd"), "YELLOW");
assert.equal(classifyJoint(90, 100, "hip_abd"), "YELLOW");     // exactly 10 below
assert.equal(classifyJoint(89.9, 100, "hip_abd"), "RED");
// a 90% ratio would call 45 vs 50 YELLOW and 40 vs 50 RED; flat 10 calls both YELLOW
assert.equal(classifyJoint(40, 50, "hip_abd"), "YELLOW");
assert.equal(classifyJoint(39.9, 50, "hip_abd"), "RED");
// and 130 vs 150 is RED in flat terms (20 below) although the old ratio 0.867 was also RED; 140 vs 150 YELLOW (old 0.933 YELLOW)
assert.equal(classifyJoint(140, 150, "shoulder_flex"), "YELLOW");
assert.equal(classifyJoint(139, 150, "shoulder_flex"), "RED");
// ankle: 2 cm
assert.equal(classifyJoint(10, 10, "ankle_df"), "GREEN");
assert.equal(classifyJoint(8, 10, "ankle_df"), "YELLOW");
assert.equal(classifyJoint(7.9, 10, "ankle_df"), "RED");
assert.equal(classifyJoint(null, 10, "ankle_df"), "GREY");

// ---- #3 worst measured REQUIRED joint wins; missing / no rule = GREY, never GREEN ----
const A = { hip_abd_l: 60, hip_abd_r: 60, lumbar_flex: 50 };
assert.equal(classifyMove(A, M([["Hip Abduction", 60], ["Lumbar Flexion", 45, "MIDLINE"]])).tier, "GREEN");
assert.equal(classifyMove(A, M([["Hip Abduction", 75], ["Lumbar Flexion", 45, "MIDLINE"]])).tier, "RED");       // 15 below
assert.equal(classifyMove(A, M([["Hip Abduction", 65], ["Lumbar Flexion", 45, "MIDLINE"]])).tier, "YELLOW");    // 5 below
assert.equal(classifyMove(A, M([["Hip Abduction", 60], ["Cervical Rotation", 50, "MIDLINE"]])).tier, "GREY");  // unmeasured joint
assert.equal(classifyMove(A, M([["Hip Abduction", 75], ["Cervical Rotation", 50, "MIDLINE"]])).tier, "RED");   // RED beats GREY
assert.equal(classifyMove(A, []).tier, "GREY");                                                                  // no rule
assert.equal(classifyMove({}, M([["Hip Abduction", 10]])).tier, "GREY");                                         // nothing measured
// an unrequired unmeasured joint never matters (a move uses an assessment only if it needs that joint)
assert.equal(classifyMove({ hip_abd_l: 60, hip_abd_r: 60 }, M([["Hip Abduction", 60]])).tier, "GREEN");

// ---- #6 dominant side per move: LEAD = dominant, HOOK/TRAIL = the other side, BOTH = worse, ANY = better ----
const S = { hip_er_l: 30, hip_er_r: 50 };
assert.equal(athleteValue(S, "hip_er", "BOTH", "right"), 30);
assert.equal(athleteValue(S, "hip_er", "ANY", "right"), 50);
assert.equal(athleteValue(S, "hip_er", "LEAD", "right"), 50);
assert.equal(athleteValue(S, "hip_er", "LEAD", "left"), 30);
assert.equal(athleteValue(S, "hip_er", "HOOK", "right"), 30);
assert.equal(athleteValue(S, "hip_er", "TRAIL", "right"), 30);
assert.equal(athleteValue(S, "hip_er", "HOOK", "left"), 50);
assert.equal(athleteValue(S, "hip_er", "TRAIL", "left"), 50);
assert.equal(athleteValue(S, "hip_er", "MIDLINE", "right"), 30);
assert.equal(athleteValue(S, "hip_er", null, "right"), 30);
// no dominant side on file: worse side (never looser)
for (const r of ["LEAD", "HOOK", "TRAIL"]) assert.equal(athleteValue(S, "hip_er", r, null), 30, r);
assert.equal(athleteValue(S, "hip_er", "LEAD", "sideways" as never), 30);
// named side not measured: use the side that was
// ONE SIDE LOGGED (PENDING JIM, default "grey"): the named side missing = not measured (GREY), never a guess
assert.equal(ONE_SIDE_MISSING_POLICY, "grey");
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "LEAD", "right"), null);      // dominant right side not logged
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "LEAD", "left"), 40);         // the rule needs only the left side
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "HOOK", "right"), 40);        // non-dominant = left
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "BOTH"), null);
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "ANY"), null);
assert.equal(athleteValue({ hip_er_r: 40 }, "hip_er", "MIDLINE"), null);
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "BOTH", null, "use_measured_side"), 40);   // old behavior behind the one constant
assert.equal(athleteValue({ hip_er_l: 40 }, "hip_er", "LEAD", "right", "use_measured_side"), 40);
assert.equal(classifyMove({ hip_er_r: 10 }, M([["Hip ER", 45]])).tier, "GREY");     // one side RED-looking but other side blank -> Not rated
// per-leg SLR color follows the same side selection
assert.equal(pickLegStatus("GREEN", "YELLOW", "BOTH"), "YELLOW");
assert.equal(pickLegStatus("GREEN", "YELLOW", "ANY"), "GREEN");
assert.equal(pickLegStatus("GREEN", "YELLOW", "LEAD", "left"), "GREEN");
assert.equal(pickLegStatus("GREEN", "YELLOW", "LEAD", "right"), "YELLOW");
assert.equal(pickLegStatus("GREEN", "YELLOW", "TRAIL", "left"), "YELLOW");
assert.equal(pickLegStatus("GREEN", "GREY", "BOTH"), "GREY");
assert.equal(pickLegStatus("GREEN", "GREY", "LEAD", "left"), "GREEN");
assert.equal(pickLegStatus("GREY", "GREY", "ANY"), "GREY");
assert.equal(pickLegStatus("RED", "GREY", "BOTH", null, "use_measured_side"), "RED");
assert.equal(normalizeDominant("Right"), "right");
assert.equal(normalizeDominant("L"), "left");
assert.equal(normalizeDominant("ambidextrous"), null);
// whole-move effect: LEAD 45 needed, right-dominant athlete with 30/50 -> GREEN; left-dominant -> RED (15 below)
assert.equal(classifyMove(S, M([["Hip ER", 45, "LEAD"]]), "right").tier, "GREEN");
assert.equal(classifyMove(S, M([["Hip ER", 45, "LEAD"]]), "left").tier, "RED");
assert.equal(classifyMove(S, M([["Hip ER", 45, "TRAIL"]]), "right").tier, "RED");
assert.equal(classifyMove(S, M([["Hip ER", 45, "LEAD"]])).tier, "RED");   // unknown dominant -> worse side
// side gaps are a NOTE only: a 20 degree gap never changes a color, and the 15% / 25% sheet downgrade is gone
assert.deepEqual(sideGapNote(S, "hip_er"), { left: 30, right: 50, gap: 20 });
assert.equal(sideGapNote({ hip_er_l: 30 }, "hip_er"), null);
assert.equal(sideGapNote(S, "lumbar_flex"), null);
const sym = classifyMove({ hip_er_l: 60, hip_er_r: 60 }, M([["Hip ER", 45]]));
const asym = classifyMove({ hip_er_l: 46, hip_er_r: 80 }, M([["Hip ER", 45]]));   // 55% gap, both sides meet the need
assert.equal(sym.tier, "GREEN");
assert.equal(asym.tier, "GREEN");
// two rows for one move + joint: the STRICTER row wins
const two = buildRequirements([
  { joint: "Hip ER", required_value: 40, laterality_rule: "LEAD" },
  { joint: "Hip ER", required_value: 55, laterality_rule: "TRAIL" },
]);
assert.deepEqual(two.map(q => [q.joint, q.required, q.laterality]), [["hip_er", 55, "TRAIL"]]);
const two2 = buildRequirements([
  { joint: "Hip ER", required_value: 55, laterality_rule: "TRAIL" },
  { joint: "Hip ER", required_value: 40, laterality_rule: "LEAD" },
]);
assert.deepEqual(two2.map(q => [q.joint, q.required]), [["hip_er", 55]]);

// ---- #5 pack percent (DRAFT, flag OFF) ----
const mv = (tier: MoveForRating["tier"], js: [string, MoveForRating["tier"]][], reason: MoveForRating["grey_reason"] = null): MoveForRating =>
  ({ tier, grey_reason: reason, joint_status: js.map(([joint, status]) => ({ joint, status })) });
const moves: MoveForRating[] = [
  mv("GREEN", [["hip_er", "GREEN"]]),
  mv("GREEN", [["hip_er", "GREEN"], ["hip_abd", "GREEN"]]),
  mv("YELLOW", [["hip_er", "YELLOW"]]),
  mv("RED", [["hip_er", "RED"]]),
  mv("GREY", [["hip_er", "GREEN"], ["cervical_rot", "GREY"]], "incomplete"),   // needs a test
  mv("RED", [["hip_er", "RED"], ["cervical_rot", "GREY"]]),                    // RED but a joint unmeasured: not fully scoreable
  mv("GREY", [], "no_rule"),                                                    // permanently not rated
  mv("GREY", [], "no_rule"),
];
assert.equal(PACK_PERCENT_MODE, "green_only");
let pr = packRating(moves);
assert.deepEqual(
  { pct: pr.pct, can_do: pr.can_do, almost: pr.almost, scored: pr.scored, total: pr.total, not_rated: pr.not_rated, no_rule: pr.no_rule, needs_test: pr.needs_test },
  { pct: 50, can_do: 2, almost: 1, scored: 4, total: 8, not_rated: 4, no_rule: 2, needs_test: 2 },
);
assert.equal(pr.scored_text, "scored 4 of 8 moves");
assert.equal(pr.not_rated_text, "4 need a test or have no rule yet");
pr = packRating(moves, "yellow_half");                    // Grant's alternative: (2 + 0.5) / 4
assert.equal(pr.pct, 63);
assert.equal(pr.scored, 4);                               // grey stays out of the denominator in both modes
assert.equal(packRating([mv("GREY", [], "no_rule")]).pct, null);   // nothing scoreable: no percent
assert.equal(packRating([]).pct, null);
assert.equal(packRatingIfEnabled(false, moves), null);    // default OFF
assert.equal(packRatingIfEnabled(true, moves)!.pct, 50);
// never GREEN from unmeasured: a move with only GREY joints is not counted as can_do
assert.equal(packRating([mv("GREY", [["a", "GREY"]], "incomplete")]).can_do, 0);
// no shared AT RISK / ELITE label anywhere in the output
assert.ok(!/AT RISK|ELITE/i.test(JSON.stringify(packRating(moves))));
console.log("compute-tiers decisions tests: ok");

// ---- invalid entries: negative = not measured (GREY), zero = real value (RED) ----
import { toNum } from "../rule.ts";
import { gradeHipFlexLeg as _hip, gradeAnkleCmLeg as _ank } from "../base_norms.ts";
assert.equal(toNum(-1), null); assert.equal(toNum(0), 0); assert.equal(toNum(""), null); assert.equal(toNum(true), null); assert.equal(toNum("45"), 45);
assert.equal(classifyMove({ lumbar_flex: -1 }, buildRequirements([{ joint: "Lumbar Flexion", required_value: 50, laterality_rule: "MIDLINE" }])).tier, "GREY");
assert.equal(classifyMove({ shoulder_flex_l: 0, shoulder_flex_r: 0 }, buildRequirements([{ joint: "Shoulder Flexion", required_value: 165, laterality_rule: "BOTH" }])).tier, "RED");
assert.equal(_hip("male", -5).status, "GREY"); assert.equal(_hip("male", 0).status, "RED"); assert.equal(_ank(0).status, "RED"); assert.equal(_ank(-2).status, "GREY");
console.log("compute-tiers invalid-entry tests: ok");
