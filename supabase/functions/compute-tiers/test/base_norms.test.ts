import assert from "node:assert/strict";
import {
  HIP_FLEX_SLR_NORMS, HIP_FLEX_ASYMMETRY_FLAG_DEG, HIP_FLEX_REVIEW_ABOVE_DEG, HIP_FLEX_ABOVE_REVIEW_HANDLING,
  HIP_FLEX_YELLOW_WIDEN_DEG, normalizeSex, gradeHipFlexLeg, gradeHipFlexion, hipFlexAsymmetry, worstOf,
  gradeAnkleCmLeg, gradeAnkleDf, gradeBaseJoints, ANKLE_DF_CM_TARGET, ANKLE_DF_CM_GREEN_MIN,
} from "../base_norms.ts";

// table sanity: edges are mean-1SD and mean-2SD of Youdas 2005 (men 68.5+/-6.8, women 76.3+/-9.5)
assert.equal(HIP_FLEX_YELLOW_WIDEN_DEG, 0);
const M = HIP_FLEX_SLR_NORMS.male, F = HIP_FLEX_SLR_NORMS.female;
assert.deepEqual([M.green_min, M.yellow_min, F.green_min, F.yellow_min], [61.7, 54.9, 66.8, 57.3]);
assert.ok(Math.abs(M.mean - M.sd - M.green_min) < 1e-9 && Math.abs(M.mean - 2 * M.sd - M.yellow_min) < 1e-9);
assert.ok(Math.abs(F.mean - F.sd - F.green_min) < 1e-9 && Math.abs(F.mean - 2 * F.sd - F.yellow_min) < 1e-9);

// sex parsing: only clear male / female grade; everything else is unknown
for (const [raw, want] of [["male", "male"], ["Female", "female"], [" M ", "male"], ["other", "unknown"],
  ["prefer_not_to_say", "unknown"], [null, "unknown"], [undefined, "unknown"], ["", "unknown"]] as const) {
  assert.equal(normalizeSex(raw), want, String(raw));
}

// MALE edges: 61.7 GREEN, 61.6 YELLOW, 54.9 YELLOW, 54.8 RED
const g = (sex: string | null, v: number | null) => gradeHipFlexLeg(sex, v).status;
assert.equal(g("male", 70), "GREEN");
assert.equal(g("male", 61.7), "GREEN");
assert.equal(g("male", 61.6), "YELLOW");
assert.equal(g("male", 54.9), "YELLOW");
assert.equal(g("male", 54.8), "RED");
assert.equal(g("male", 30), "RED");
// FEMALE edges: 66.8 GREEN, 66.7 YELLOW, 57.3 YELLOW, 57.2 RED
assert.equal(g("female", 80), "GREEN");
assert.equal(g("female", 66.8), "GREEN");
assert.equal(g("female", 66.7), "YELLOW");
assert.equal(g("female", 57.3), "YELLOW");
assert.equal(g("female", 57.2), "RED");
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

// ANKLE, knee-to-wall, cm: GREEN >= 10, YELLOW 8.4 to <10 (PROPOSED width 1.6), RED below, GREY unmeasured
assert.equal(ANKLE_DF_CM_GREEN_MIN, 10);
assert.equal(ANKLE_DF_CM_TARGET, 10); // F-17: no longer the literal 20
const a = (v: number | null) => gradeAnkleCmLeg(v).status;
assert.equal(a(14), "GREEN");
assert.equal(a(10), "GREEN");
assert.equal(a(9.9), "YELLOW");
assert.equal(a(8.4), "YELLOW");
assert.equal(a(8.3), "RED");
assert.equal(a(null), "GREY");
let k = gradeAnkleDf(12, 8);
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
