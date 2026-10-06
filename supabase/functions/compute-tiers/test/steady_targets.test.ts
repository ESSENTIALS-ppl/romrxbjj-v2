// Steady targets (Jim decisions, Oct 6 2026): hip_er 29, hip_ir 26 (Simoneau et al. 1998; were 45), hip_abd 40 (was 90),
// shoulder_flex 140 (Gill et al. 2020; was 180), ankle_df 6 cm (Konor 2012 / McBride 2026; was 20),
// cervical_rot 70 (was 80), cervical_lat 38 (was 45) (Swinkels & Swinkels-Meewisse 2014, Spine, PMID 24573069),
// shoulder_er 40 (was 90; tucked-elbow test lying on your back, Gill et al. 2020, PMID 33046038; Jim 11:45 AM).
// Checks compute-tiers JOINT_TARGETS, the lead email BAND_JOINTS, and the compute_joint_scores migration agree, and that
// worst_joints / rom_total follow the new targets. Run: deno run -A supabase/functions/compute-tiers/test/steady_targets.test.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { romTotal, worstJointKeys } from "../joint_totals.ts";
import { jointPercents, mobilityScore, overallBandScore } from "../../submit-lead-assessment/email.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const parse = (src: string) => {
  const body = src.match(/const JOINT_TARGETS: Record<string, number> = \{([\s\S]*?)\};/)![1].replace(/\/\/.*$/gm, "");
  return Object.fromEntries([...body.matchAll(/(\w+):\s*([\d.]+)/g)].map(m => [m[1], Number(m[2])])) as Record<string, number>;
};
const T = parse(read("../index.ts"));
const toNum = (v: unknown): number | null => (v == null ? null : isFinite(Number(v)) ? Number(v) : null);

// 1. compute-tiers targets
assert.deepEqual([T.hip_er_l, T.hip_er_r, T.hip_ir_l, T.hip_ir_r, T.hip_abd_l, T.hip_abd_r], [29, 29, 26, 26, 40, 40]);
assert.deepEqual([T.shoulder_flex_l, T.shoulder_flex_r, T.ankle_df_l, T.ankle_df_r], [140, 140, 6, 6]);
assert.deepEqual([T.cervical_rot_l, T.cervical_rot_r, T.cervical_lat_l, T.cervical_lat_r], [70, 70, 38, 38]);
assert.deepEqual([T.shoulder_er_l, T.shoulder_er_r], [40, 40], "shoulder ER 40 (tucked elbow)");
assert.deepEqual([T.hip_flex_l, T.cervical_flex, T.cervical_ext, T.lumbar_flex, T.lumbar_ext, T.hip_ext_l, T.balance_l],
  [120, 50, 60, 60, 25, 30, 30], "other targets unchanged (neck flexion 50 / extension 60 included)");

// 2. lead email + submit-lead whitelist use the same hip targets
const email = read("../../submit-lead-assessment/email.ts");
for (const [k, t] of [["hip_er", 29], ["hip_ir", 26], ["hip_abd", 40], ["shoulder_er", 40], ["shoulder_flex", 140], ["ankle_df", 6], ["cervical_rot", 70], ["cervical_lat", 38]] as const) {
  assert.ok(new RegExp(`\\{ target: ${t}, key: "${k}"`).test(email), `email.ts BAND_JOINTS ${k} = ${t}`);
}
const lead = parse(read("../../submit-lead-assessment/index.ts"));
assert.deepEqual([lead.hip_er_l, lead.hip_ir_l, lead.hip_abd_l, lead.shoulder_flex_l, lead.ankle_df_l, lead.cervical_rot_l, lead.cervical_lat_l], [29, 26, 40, 140, 6, 70, 38]);
assert.deepEqual([lead.shoulder_er_l, lead.shoulder_er_r], [40, 40]);

// 3. migration: compute_joint_scores() + protocol_joint_ranking(). Rollback holds the VERBATIM live definitions (md5 read
//    from project cqzvqzwwevnflinxgnpp 2026-10-06); the up migration differs from them only on the marked target values.
const dir = "../../../migrations/";
const up = read(dir + "20261006153000_steady_targets_hip_shoulder_ankle.sql");
const rb = read(dir + "20261006153000_steady_targets_hip_shoulder_ankle.rollback.sql.txt");
const defs = (t: string) => [...t.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$function\$;/g)]
  .map(m => ({ name: m[1], text: m[0].replace(/;$/, "") + "\n" }));
const LIVE_MD5: Record<string, string> = {
  compute_joint_scores: "3cb3161a3ad67f7fb23e5fcc4cf00ef8",
  protocol_joint_ranking: "91ee8f4611b07a9f1951b4afad1caa6c",
};
const upDefs = defs(up), rbDefs = defs(rb);
assert.deepEqual(upDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
assert.deepEqual(rbDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
for (const d of rbDefs) assert.equal(createHash("md5").update(d.text).digest("hex"), LIVE_MD5[d.name], `rollback ${d.name} = live`);
const changedLines = (i: number) => {
  const u = upDefs[i].text.split("\n"), l = rbDefs[i].text.split("\n");
  assert.equal(u.length, l.length);
  const norm = (x: string) => x.trim().replace(/(\S)\s+-- .*$/, "$1"); // drop the trailing "-- Oct 6 2026: ..." markers only
  return u.map((x, k) => [norm(x), norm(l[k])]).filter(([x, y]) => x !== y);
};
assert.deepEqual(changedLines(0), [
  ["('hip_er','hip_er_l','hip_er_r',29::numeric),", "('hip_er','hip_er_l','hip_er_r',45::numeric),"],
  ["('hip_ir','hip_ir_l','hip_ir_r',26),", "('hip_ir','hip_ir_l','hip_ir_r',45),"],
  ["('hip_abd','hip_abd_l','hip_abd_r',40),", "('hip_abd','hip_abd_l','hip_abd_r',90),"],
  ["('shoulder_er','shoulder_er_l','shoulder_er_r',40),", "('shoulder_er','shoulder_er_l','shoulder_er_r',90),"],
  ["('shoulder_flex','shoulder_flex_l','shoulder_flex_r',140),", "('shoulder_flex','shoulder_flex_l','shoulder_flex_r',180),"],
  ["('ankle_df','ankle_df_l','ankle_df_r',6),", "('ankle_df','ankle_df_l','ankle_df_r',20),"],
  ["('cervical_rot','cervical_rot_l','cervical_rot_r',70),", "('cervical_rot','cervical_rot_l','cervical_rot_r',80),"],
  ["('cervical_lat','cervical_lat_l','cervical_lat_r',38)", "('cervical_lat','cervical_lat_l','cervical_lat_r',45)"],
]);
// protocol_joint_ranking: only the last (target) column changes; normal_min (Protocol minimum, 2nd-to-last) stays
assert.deepEqual(changedLines(1), [
  ["(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric, 29::numeric),", "(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric, 45::numeric),"],
  ["(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30, 26),", "(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30, 45),"],
  ["(3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40),", "(3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 90),"],
  // shoulder ER: target 90 -> 40; normal_min 60 deliberately kept even though it now sits above the target (listed for Jim)
  ["(5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 40),", "(5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 90),"],
  ["(6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 140),", "(6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 180),"],
  ["(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10, 6),", "(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10, 20),"],
  ["(10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 70)", "(10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 80)"],
]);
assert.ok(!/techniques|recompute_user_eligibility/.test(up.replace(/^--.*$/gm, "")), "no technique minimum change in the migration body");

// 4. worst_joints + rom_total with the new targets
const a = { hip_er_l: 29, hip_er_r: 30, hip_ir_l: 26, hip_ir_r: 26, hip_abd_l: 40, hip_abd_r: 41, shoulder_er_l: 80, shoulder_er_r: 85, ankle_df_l: 4, ankle_df_r: 4.5, lumbar_flex: 50, shoulder_flex_l: 140, shoulder_flex_r: 150 };
assert.deepEqual(worstJointKeys(a, T, toNum, 3), ["ankle_df_l", "ankle_df_r", "lumbar_flex"], "Steady hips / shoulder flexion are no longer weak spots");
assert.deepEqual(worstJointKeys({ ankle_df_l: 6, shoulder_flex_l: 139 }, T, toNum, 1), ["shoulder_flex_l"], "139 shoulder flexion is below target");
assert.deepEqual(worstJointKeys({ ankle_df_l: 5.5, shoulder_flex_l: 140 }, T, toNum, 1), ["ankle_df_l"], "5.5 cm ankle is below target");
assert.deepEqual(worstJointKeys({ hip_er_l: 28, hip_ir_l: 26, hip_abd_l: 40 }, T, toNum, 1), ["hip_er_l"], "28 ER is below target");
assert.deepEqual(worstJointKeys({ hip_er_l: 29, hip_ir_l: 25, hip_abd_l: 40 }, T, toNum, 1), ["hip_ir_l"], "25 IR is below target");
assert.deepEqual(worstJointKeys({ hip_er_l: 29, hip_ir_l: 26, hip_abd_l: 39 }, T, toNum, 1), ["hip_abd_l"], "39 abduction is below target");
assert.equal(romTotal({ hip_er_l: 29, hip_ir_l: 26, hip_abd_l: 40 }, T, toNum), 100);
assert.equal(romTotal({ hip_er_l: 14.5, hip_ir_l: 13, hip_abd_l: 20 }, T, toNum), 50);

// 5. lead email bands: 29 ER / 26 IR / 40 ABD Steady, 28 / 25 / 39 Building
assert.equal(overallBandScore({ hip_er_l: 29, hip_er_r: 29, hip_ir_l: 26, hip_ir_r: 26, hip_abd_l: 40, hip_abd_r: 40 }), 3);
assert.equal(mobilityScore({ hip_er_l: 29, hip_er_r: 29, hip_ir_l: 26, hip_ir_r: 26, hip_abd_l: 40, hip_abd_r: 40 }), 100);
for (const [k, steady, under] of [["hip_er", 29, 28], ["hip_ir", 26, 25], ["hip_abd", 40, 39], ["shoulder_er", 40, 39], ["shoulder_flex", 140, 139], ["ankle_df", 6, 5.5], ["cervical_rot", 70, 69], ["cervical_lat", 38, 37]] as const) {
  assert.equal(overallBandScore({ [`${k}_l`]: steady, [`${k}_r`]: steady }), 3, `${k} ${steady}`);
  assert.equal(overallBandScore({ [`${k}_l`]: under, [`${k}_r`]: steady }), 2, `${k} ${under}`);
  assert.deepEqual(jointPercents({ [`${k}_l`]: under })[k].band, 2);
  assert.ok(jointPercents({ [`${k}_l`]: under })[k].pct < 100);
  assert.deepEqual(jointPercents({ [`${k}_l`]: steady })[k], { pct: 100, band: 3 });
}
assert.deepEqual(worstJointKeys({ cervical_rot_l: 69, cervical_lat_l: 38, lumbar_flex: 60 }, T, toNum, 1), ["cervical_rot_l"], "69 neck rotation is below target");
assert.deepEqual(worstJointKeys({ cervical_rot_l: 70, cervical_lat_l: 37, lumbar_flex: 60 }, T, toNum, 1), ["cervical_lat_l"], "37 side bend is below target");
assert.equal(romTotal({ cervical_rot_l: 70, cervical_lat_l: 38, cervical_lat_r: 40 }, T, toNum), 100);
// persist_protocol.ts (dead code): hip_flex lined up with the SLR typical range 60-80
assert.ok(/key: "hip_flex", leftKey: "hip_flex_l", rightKey: "hip_flex_r", normalMin: 60, riskBelow: 60 \}/.test(read("../../_shared/persist_protocol.ts")));
// shoulder ER: 40 Steady, 39 / 36 Building (>= 90%), 35.5 Needs focus; a 39 is now a weak spot, an old-target 80 is not
assert.deepEqual(jointPercents({ shoulder_er_l: 36, shoulder_er_r: 40 }).shoulder_er.band, 2);
assert.deepEqual(jointPercents({ shoulder_er_l: 35.5, shoulder_er_r: 40 }).shoulder_er.band, 1);
assert.deepEqual(worstJointKeys({ shoulder_er_l: 39, cervical_rot_l: 70, lumbar_flex: 60 }, T, toNum, 1), ["shoulder_er_l"], "39 shoulder ER is below target");
assert.equal(romTotal({ shoulder_er_l: 80, shoulder_er_r: 40, lumbar_flex: 60 }, T, toNum), 100);
assert.equal(romTotal({ shoulder_er_l: 20, shoulder_er_r: 20 }, T, toNum), 50);
// persist_protocol.ts (dead code): shoulder_er lined up with the new target 40
assert.ok(/key: "shoulder_er", leftKey: "shoulder_er_l", rightKey: "shoulder_er_r", normalMin: 40, riskBelow: 40 \}/.test(read("../../_shared/persist_protocol.ts")));
console.log("compute-tiers steady_targets tests: ok");
