import assert from "node:assert/strict";
import {
  HIP_FLEX_SLR_NORMS, HIP_FLEX_ASYMMETRY_FLAG_DEG, HIP_FLEX_REVIEW_ABOVE_DEG, HIP_FLEX_ABOVE_REVIEW_HANDLING,
  HIP_FLEX_YELLOW_WIDEN_DEG, HIP_FLEX_GRADING_MODE, HIP_FLEX_FLAT_YELLOW_DEG, HIP_FLEX_MOVES_USE_SLR_COLOR, hipFlexEdges, ANKLE_DF_CM_YELLOW_WIDTH, normalizeSex, gradeHipFlexLeg, gradeHipFlexion, hipFlexAsymmetry, worstOf,
  gradeAnkleCmLeg, gradeAnkleDf, gradeBaseJoints, ANKLE_DF_CM_TARGET, ANKLE_DF_CM_GREEN_MIN,
} from "../base_norms.ts";

// table sanity: edges are mean-1SD and mean-2SD of Youdas 2005 (men 68.5+/-6.8, women 76.3+/-9.5)
assert.equal(HIP_FLEX_YELLOW_WIDEN_DEG, 0);
const M = HIP_FLEX_SLR_NORMS.male, F = HIP_FLEX_SLR_NORMS.female;
assert.deepEqual([M.green_min, M.yellow_min, F.green_min, F.yellow_min], [61.7, 54.9, 66.8, 57.3]);
assert.deepEqual([M.yellow_flat10_min, F.yellow_flat10_min], [51.7, 56.8]); // green_min - 10
assert.ok(Math.abs(M.mean - M.sd - M.green_min) < 1e-9 && Math.abs(M.mean - 2 * M.sd - M.yellow_min) < 1e-9);
assert.ok(Math.abs(F.mean - F.sd - F.green_min) < 1e-9 && Math.abs(F.mean - 2 * F.sd - F.yellow_min) < 1e-9);

// sex parsing: only clear male / female grade; everything else is unknown
for (const [raw, want] of [["male", "male"], ["Female", "female"], [" M ", "male"], ["other", "unknown"],
  ["prefer_not_to_say", "unknown"], [null, "unknown"], [undefined, "unknown"], ["", "unknown"]] as const) {
  assert.equal(normalizeSex(raw), want, String(raw));
}

// ONE switch, default = Jim's flat 10 degrees (PENDING JIM vs the published SD scale)
assert.equal(HIP_FLEX_GRADING_MODE, "flat10");
assert.equal(HIP_FLEX_FLAT_YELLOW_DEG, 10);
assert.equal(HIP_FLEX_MOVES_USE_SLR_COLOR, true); // PENDING JIM
// MALE edges (flat10): 61.7 GREEN, 61.6 YELLOW, 51.7 YELLOW, 51.6 RED
const g = (sex: string | null, v: number | null) => gradeHipFlexLeg(sex, v).status;
assert.equal(g("male", 70), "GREEN");
assert.equal(g("male", 61.7), "GREEN");
assert.equal(g("male", 61.6), "YELLOW");
assert.equal(g("male", 51.7), "YELLOW");
assert.equal(g("male", 51.6), "RED");
assert.equal(g("male", 30), "RED");
// FEMALE edges (flat10): 66.8 GREEN, 66.7 YELLOW, 56.8 YELLOW, 56.7 RED
assert.equal(g("female", 80), "GREEN");
assert.equal(g("female", 66.8), "GREEN");
assert.equal(g("female", 66.7), "YELLOW");
assert.equal(g("female", 56.8), "YELLOW");
assert.equal(g("female", 56.7), "RED");
// published_sd mode (option 2): YELLOW from mean - 2 SD
const gs = (sex: string, v: number) => gradeHipFlexLeg(sex, v, "published_sd").status;
assert.deepEqual(hipFlexEdges("male", "published_sd"), { green_min: 61.7, yellow_min: 54.9 });
assert.deepEqual(hipFlexEdges("female", "published_sd"), { green_min: 66.8, yellow_min: 57.3 });
assert.deepEqual(hipFlexEdges("male"), { green_min: 61.7, yellow_min: 51.7 });
assert.equal(gs("male", 54.9), "YELLOW"); assert.equal(gs("male", 54.8), "RED");
assert.equal(gs("female", 57.3), "YELLOW"); assert.equal(gs("female", 57.2), "RED");
assert.equal(gs("male", 53), "RED"); assert.equal(g("male", 53), "YELLOW");   // the 3.2 degree gap between the two options
assert.equal(gradeHipFlexion("male", 53, 53, "published_sd").grading_mode, "published_sd");
assert.equal(gradeHipFlexion("male", 53, 53).grading_mode, "flat10");
// same reading, different sex: 64 is GREEN for a man and YELLOW for a woman
assert.equal(g("male", 64), "GREEN");
assert.equal(g("female", 64), "YELLOW");

// MISSING / unknown sex: GREY with reason sex_missing, never GREEN (even for a big number)
for (const s of [null, "", "other", "prefer_not_to_say"]) {
  const r = gradeHipFlexLeg(s, 75);
  assert.deepEqual([r.status, r.reason], ["GREY", "sex_missing"]);
}
// UNMEASURED: GREY not_measured, never GREEN (null, undefined, empty, NaN)
for (const v of [null, undefined, "", "abc"]) {
  const r = gradeHipFlexLeg("male", v as unknown);
  assert.deepEqual([r.status, r.reason], ["GREY", "not_measured"]);
}
assert.equal(gradeHipFlexion("male", null, null).status, "GREY");
assert.equal(gradeHipFlexion(null, 70, 70).status, "GREY");

// PER LEG, no blend: the joint is the worse graded leg
let h = gradeHipFlexion("male", 70, 50);
assert.deepEqual([h.left.status, h.right.status, h.status], ["GREEN", "RED", "RED"]);
h = gradeHipFlexion("female", 80, 62);
assert.deepEqual([h.left.status, h.right.status, h.status], ["GREEN", "YELLOW", "YELLOW"]);
assert.equal(h.test, "straight_leg_raise");
// one leg missing: the measured leg decides, partial flag set, never GREEN from a blank
h = gradeHipFlexion("male", 70, null);
assert.deepEqual([h.status, h.partial, h.right.status], ["GREEN", true, "GREY"]);
h = gradeHipFlexion("male", null, 50);
assert.deepEqual([h.status, h.partial], ["RED", true]);
assert.equal(gradeHipFlexion("male", 70, 70).partial, false);

// ASYMMETRY: flagged when the gap is OVER the threshold (10), not at it; independent of sex; not a grade
assert.equal(HIP_FLEX_ASYMMETRY_FLAG_DEG, 10);
assert.deepEqual(hipFlexAsymmetry(70, 60).flag, false);   // exactly 10: not flagged
assert.deepEqual(hipFlexAsymmetry(70, 59.9).flag, true);  // 10.1
assert.deepEqual(hipFlexAsymmetry(55, 72).flag, true);
assert.equal(hipFlexAsymmetry(55, 72).diff_deg, 17);
assert.equal(hipFlexAsymmetry(70, null).flag, null);      // cannot tell
assert.equal(hipFlexAsymmetry(null, null).flag, null);
assert.equal(hipFlexAsymmetry(70, 70).threshold_source, "REASONING");
// asymmetry flag survives missing sex and does not change colors
h = gradeHipFlexion(null, 80, 55);
assert.deepEqual([h.status, h.asymmetry.flag], ["GREY", true]);
h = gradeHipFlexion("male", 82, 70);
assert.deepEqual([h.status, h.asymmetry.flag], ["GREEN", true]); // gap flagged, both legs GREEN

// OVER 90 (PENDING JIM): constant is single, default grades normally, and the flag is always reported
assert.equal(HIP_FLEX_REVIEW_ABOVE_DEG, 90);
assert.equal(HIP_FLEX_ABOVE_REVIEW_HANDLING, "grade_normally");
let leg = gradeHipFlexLeg("male", 95);
assert.deepEqual([leg.status, leg.above_review_limit], ["GREEN", true]);
assert.equal(gradeHipFlexLeg("male", 90).above_review_limit, false);
assert.equal(gradeHipFlexLeg("male", 90.1).above_review_limit, true);
assert.equal(gradeHipFlexLeg(null, 95).above_review_limit, true); // flag even when sex is missing

// ELITE stays strict: nothing here can produce an ELITE value
assert.ok(!JSON.stringify(gradeHipFlexion("male", 120, 120)).includes("ELITE"));

// worstOf
assert.equal(worstOf(["GREEN", "YELLOW"]), "YELLOW");
assert.equal(worstOf(["GREEN", "GREY"]), "GREEN");
assert.equal(worstOf(["GREY", "GREY"]), "GREY");
assert.equal(worstOf(["RED", "YELLOW", "GREEN"]), "RED");

// ANKLE, knee-to-wall, cm: GREEN >= 10 (PROPOSED), YELLOW flat 2 cm below (8 to <10, Jim's closed rule), RED below, GREY unmeasured
assert.equal(ANKLE_DF_CM_YELLOW_WIDTH, 2);
assert.equal(ANKLE_DF_CM_GREEN_MIN, 10);
assert.equal(ANKLE_DF_CM_TARGET, 10); // F-17: no longer the literal 20
const a = (v: number | null) => gradeAnkleCmLeg(v).status;
assert.equal(a(14), "GREEN");
assert.equal(a(10), "GREEN");
assert.equal(a(9.9), "YELLOW");
assert.equal(a(8), "YELLOW");
assert.equal(a(7.9), "RED");
assert.equal(a(null), "GREY");
let k = gradeAnkleDf(12, 7);
assert.deepEqual([k.left.status, k.right.status, k.status, k.unit, k.test], ["GREEN", "RED", "RED", "cm", "knee_to_wall"]);
k = gradeAnkleDf(null, null);
assert.equal(k.status, "GREY");
k = gradeAnkleDf(11, null);
assert.deepEqual([k.status, k.partial], ["GREEN", true]);

// bundle used by index.ts
const b = gradeBaseJoints("female", { hip_flex_l: 70, hip_flex_r: 60, ankle_df_l: 11, ankle_df_r: 9 });
assert.deepEqual([b.hip_flex.status, b.hip_flex.asymmetry.flag, b.ankle_df.status], ["YELLOW", false, "YELLOW"]);
const none = gradeBaseJoints(null, {});
assert.deepEqual([none.hip_flex.status, none.ankle_df.status], ["GREY", "GREY"]);
console.log("compute-tiers base_norms tests: ok");

// ---- moves that list hip flexion take the straight-leg color (flagged slr_norm, PENDING JIM) ----
import { buildRequirements, classifyMove } from "../rule.ts";
{
  const reqs = buildRequirements([{ joint: "Hip Flexion", required_value: 110, laterality_rule: "BOTH" }, { joint: "Hip ER", required_value: 40, laterality_rule: "BOTH" }]);
  const A = { hip_flex_l: 68, hip_flex_r: 70, hip_er_l: 50, hip_er_r: 50 };
  // raw compare of a straight-leg reading to the matrix 110 would be RED (the old, wrong comparison)
  assert.equal(classifyMove(A, reqs).tier, "RED");
  const hf = gradeBaseJoints("male", A).hip_flex;
  const r = classifyMove(A, reqs, null, { hip_flex: { status: hf.status, basis: "slr_norm" } });
  assert.equal(r.tier, "GREEN");
  assert.equal(r.joint_status.find(j => j.joint === "hip_flex")!.basis, "slr_norm");
  // sex missing: hip flexion GREY -> move GREY (incomplete), never GREEN
  const g2 = gradeBaseJoints(null, A).hip_flex;
  const r2 = classifyMove(A, reqs, null, { hip_flex: { status: g2.status, basis: "slr_norm" } });
  assert.deepEqual([r2.tier, r2.grey_reason], ["GREY", "incomplete"]);
  // a real RED elsewhere still wins over an SLR GREEN
  const r3 = classifyMove({ ...A, hip_er_l: 10 }, reqs, null, { hip_flex: { status: "GREEN", basis: "slr_norm" } });
  assert.equal(r3.tier, "RED");
  // SLR RED colors the move RED
  const r4 = classifyMove(A, reqs, null, { hip_flex: { status: "RED", basis: "slr_norm" } });
  assert.equal(r4.tier, "RED");
}

// ---- ankle cm is NEVER compared to the matrix's degree rows (F-17): such rows stay GREY, never GREEN or RED ----
{
  const cm = { ankle_df_l: 11, ankle_df_r: 11 };
  for (const deg of [10, 15, 20]) {
    const r = classifyMove(cm, buildRequirements([{ joint: "Ankle DF", required_value: deg, laterality_rule: "BOTH" }]));
    assert.deepEqual([r.tier, r.grey_reason], ["GREY", "incomplete"], `matrix ${deg}`);
    assert.equal(r.joint_status[0].status, "GREY");
  }
}
console.log("compute-tiers hip move + ankle unit tests: ok");

// ---- SEX-MISSING POLICY (PENDING JIM; 31 of 35 users have no gender on file) ----
import { HIP_FLEX_SEX_MISSING_POLICY, hipFlexCombinedEdges } from "../base_norms.ts";
{
  assert.equal(HIP_FLEX_SEX_MISSING_POLICY, "grey");                        // default: Quinn's table has no combined row
  assert.deepEqual(hipFlexCombinedEdges("flat10"), { green_min: 61.7, yellow_min: 51.7 });       // lower of men / women
  assert.deepEqual(hipFlexCombinedEdges("published_sd"), { green_min: 61.7, yellow_min: 54.9 });
  for (const sx of [null, undefined, "", "other", "prefer_not_to_say"]) {
    const d = gradeHipFlexion(sx, 80, 80);
    assert.deepEqual([d.status, d.left.reason, d.sex_policy], ["GREY", "sex_missing", "grey"]);
    const c = gradeHipFlexion(sx, 80, 80, "flat10", "combined_lenient");
    assert.deepEqual([c.status, c.sex_policy], ["GREEN", "combined_lenient"]);
  }
  const lenient = (v: number, mode: "flat10" | "published_sd" = "flat10") => gradeHipFlexion(null, v, v, mode, "combined_lenient").status;
  assert.equal(lenient(61.7), "GREEN"); assert.equal(lenient(61.6), "YELLOW");
  assert.equal(lenient(51.7), "YELLOW"); assert.equal(lenient(51.6), "RED");
  assert.equal(lenient(54.9, "published_sd"), "YELLOW"); assert.equal(lenient(54.8, "published_sd"), "RED");
  assert.equal(lenient(null as unknown as number), "GREY");                  // unmeasured is still GREY, never GREEN
  // sex on file is unaffected by the policy
  for (const pol of ["grey", "combined_lenient"] as const) {
    const w = gradeHipFlexion("female", 64, 64, "flat10", pol);
    assert.deepEqual([w.status, w.sex_policy], ["YELLOW", "sex_on_file"]);
  }
  // asymmetry flag and over-90 flag still reported with no sex under "grey"
  const x = gradeHipFlexion(null, 95, 70);
  assert.deepEqual([x.status, x.asymmetry.flag, x.left.above_review_limit], ["GREY", true, true]);
}
console.log("compute-tiers sex-missing policy tests: ok");
