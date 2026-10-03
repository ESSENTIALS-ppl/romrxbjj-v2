import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { classifyYogaJoint, classifyYogaPose, YOGA_ACCEPT_PROXY, type YogaJointRow } from "../yoga_rule.ts";
import { GREY_BEATS_YELLOW } from "../rule.ts";

assert.equal(GREY_BEATS_YELLOW, true);      // the tests below pin the #74 default (Quinn's reference); the switch lives in rule.ts
assert.equal(YOGA_ACCEPT_PROXY, false);
const J = (base_key: string | null, over: Partial<YogaJointRow> = {}): YogaJointRow => ({
  joint_key: base_key ?? "x:knee:flexion", base_key, measure_status: base_key ? "base" : "not_measured",
  required_value: null, required_unit: null, ...over });
const signed = (base_key: string, v: number, unit: "deg" | "cm" = "deg", over: Partial<YogaJointRow> = {}) =>
  J(base_key, { required_value: v, required_unit: unit, ...over });
// a Base profile that is as flexible as it gets: if a null range could ever read GREEN, this would show it
const great = { hip_er_l: 90, hip_er_r: 90, hip_ir_l: 90, hip_ir_r: 90, hip_abd_l: 90, hip_abd_r: 90, hip_flex_l: 120, hip_flex_r: 120,
  shoulder_er_l: 120, shoulder_er_r: 120, shoulder_flex_l: 180, shoulder_flex_r: 180, ankle_df_l: 15, ankle_df_r: 15,
  cervical_lat_l: 60, cervical_lat_r: 60, lumbar_flex: 90, lumbar_ext: 40, cervical_flex: 70, cervical_ext: 80 };

// 1) NO SIGNED RANGE => GREY, whatever the athlete measured, and never GREEN
for (const key of Object.keys({ hip_er: 1, hip_ir: 1, hip_abd: 1, hip_flex: 1, shoulder_er: 1, shoulder_flex: 1, ankle_df: 1, cervical_lat: 1, lumbar_flex: 1, lumbar_ext: 1, cervical_flex: 1, cervical_ext: 1 })) {
  const r = classifyYogaJoint(great, J(key));
  assert.deepEqual([r.status, r.reason], ["GREY", "no_range_signed"], key);
  for (const bad of [0, -5, "", null, "abc", NaN]) {
    assert.equal(classifyYogaJoint(great, J(key, { required_value: bad as never, required_unit: "deg" })).status, "GREY", `${key} ${String(bad)}`);
  }
}
let p = classifyYogaPose(great, [J("hip_abd"), J("shoulder_flex"), J("lumbar_ext")]);
assert.deepEqual([p.tier, p.grey_reason], ["GREY", "no_range_signed"]);
assert.deepEqual(p.joint_status.map((x) => x.status), ["GREY", "GREY", "GREY"]);
p = classifyYogaPose(great, []);                                           // a pose with no joint demand (SUN01, PRN03, RST01, RST02)
assert.deepEqual([p.tier, p.grey_reason, p.joint_status], ["GREY", "no_joints", []]);
// numbers never leave the module
assert.ok(!JSON.stringify(classifyYogaPose(great, [signed("hip_abd", 60)])).match(/60/));

// 2) every pose in the Quinn CSV load is GREY today (0 signed ranges), even for a perfect Base profile
const map = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../../yoga-load/yoga_pose_joints.json"), "utf8")) as Record<string, any[]>;
const codes = Object.keys(map);
assert.equal(codes.length, 169);
let greys = 0;
for (const code of codes) {
  const r = classifyYogaPose(great, map[code].map((j) => ({ ...j, required_value: null, required_unit: null })));
  assert.equal(r.tier, "GREY", code);
  greys++;
}
assert.equal(greys, 169);
for (const code of ["SUN01", "PRN03", "RST01", "RST02"]) assert.equal(classifyYogaPose(great, map[code]).grey_reason, "no_joints", code);
assert.equal(classifyYogaPose(great, map["STD10"].map((j) => ({ ...j, required_value: null, required_unit: null }))).grey_reason, "no_range_signed");

// 3) once a teacher signs: the #74 colors (flat 10 degrees, ankle 2 cm, worst joint wins)
const at = (v: number) => ({ hip_abd_l: v, hip_abd_r: v });
assert.equal(classifyYogaJoint(at(60), signed("hip_abd", 60)).status, "GREEN");
assert.equal(classifyYogaJoint(at(50), signed("hip_abd", 60)).status, "YELLOW");   // exactly 10 below is still YELLOW
assert.equal(classifyYogaJoint(at(49.9), signed("hip_abd", 60)).status, "RED");
assert.equal(classifyYogaJoint({ lumbar_ext: 20 }, signed("lumbar_ext", 25, "deg", { measure_status: "base" })).status, "YELLOW");
// worse side decides; a missing side is GREY (never GREEN from a blank)
assert.equal(classifyYogaJoint({ hip_abd_l: 70, hip_abd_r: 40 }, signed("hip_abd", 60)).status, "RED");
assert.deepEqual([classifyYogaJoint({ hip_abd_l: 70 }, signed("hip_abd", 60)).status, classifyYogaJoint({ hip_abd_l: 70 }, signed("hip_abd", 60)).reason], ["GREY", "missing_value"]);
assert.equal(classifyYogaJoint({}, signed("hip_abd", 60)).reason, "missing_value");
// ankle is cm: 2 cm YELLOW; a degree range is GREY unit_mismatch (F-17)
assert.equal(classifyYogaJoint({ ankle_df_l: 9, ankle_df_r: 9 }, signed("ankle_df", 10, "cm")).status, "YELLOW");
assert.equal(classifyYogaJoint({ ankle_df_l: 7.9, ankle_df_r: 9 }, signed("ankle_df", 10, "cm")).status, "RED");
assert.deepEqual([classifyYogaJoint(great, signed("ankle_df", 12, "deg")).status, classifyYogaJoint(great, signed("ankle_df", 12, "deg")).reason], ["GREY", "unit_mismatch"]);
assert.equal(classifyYogaJoint(great, signed("hip_abd", 60, "cm")).reason, "unit_mismatch");
// a joint Base cannot measure is GREY even with a signed range
assert.equal(classifyYogaJoint(great, J(null, { required_value: 40, required_unit: "deg" })).reason, "not_measured_by_base");
// proxy joints (lumbar for spine) are GREY unless accepted
const proxy = signed("lumbar_ext", 25, "deg", { measure_status: "proxy" });
assert.equal(classifyYogaJoint(great, proxy).reason, "proxy_not_accepted");
assert.equal(classifyYogaJoint(great, proxy, true).status, "GREEN");
// hip external rotation 50+ has no reference range yet (Legal)
assert.equal(classifyYogaJoint(great, signed("hip_er", 55)).reason, "no_reference_range");
assert.equal(classifyYogaJoint(great, signed("hip_er", 45)).status, "GREEN");

// 4) pose roll-up
p = classifyYogaPose({ ...great, hip_abd_l: 40, hip_abd_r: 40 }, [signed("hip_abd", 60), J("lumbar_ext")]);
assert.equal(p.tier, "RED");                                                // RED wins over GREY
p = classifyYogaPose({ ...great, hip_abd_l: 55, hip_abd_r: 55 }, [signed("hip_abd", 60), J("lumbar_ext")]);
assert.deepEqual([p.tier, p.grey_reason], ["GREY", "no_range_signed"]);    // YELLOW + unrated joint = GREY (GREY_BEATS_YELLOW)
p = classifyYogaPose({ ...great, hip_abd_l: 55, hip_abd_r: 55 }, [signed("hip_abd", 60), signed("shoulder_flex", 150)]);
assert.equal(p.tier, "YELLOW");
p = classifyYogaPose(great, [signed("hip_abd", 60), signed("shoulder_flex", 150)]);
assert.equal(p.tier, "GREEN");                                              // GREEN only when every joint is measured, signed and in range
p = classifyYogaPose(great, [signed("hip_abd", 60), J(null, { required_value: 40, required_unit: "deg" })]);
assert.notEqual(p.tier, "GREEN");                                           // a pose never shows GREEN with an unmeasured joint
assert.deepEqual([p.tier, p.grey_reason], ["GREY", "not_measured_by_base"]);
console.log("ok yoga_rule: no signed range => GREY (12 Base joint keys x bad values, 169 CSV poses), signed colors, units, proxy, roll-up");
