// Shoulder ER Steady target 40 -> 85 (Oct 6 2026, 8:19 PM; Jim-approved, Quinn spec): Base shoulder ER is the STANDING goal-post
// test again. Checks: (1) the migration differs from the LIVE definitions (rollback file, md5 = pg_get_functiondef read
// 2026-10-06 20:30 ET) ONLY on the shoulder_er lines; (2) compute-tiers JOINT_TARGETS, the lead email BAND_JOINTS and the
// submit-lead whitelist all say 85; (3) worst_joints / rom_total / lead bands follow 85; (4) the recompute script is guarded.
// Run: deno run -A supabase/functions/compute-tiers/test/shoulder_er_85.test.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { romTotal, worstJointKeys } from "../joint_totals.ts";
import { jointPercents, mobilityScore, overallBandScore } from "../../submit-lead-assessment/email.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const parse = (src: string) => {
  const body = src.match(/const JOINT_TARGETS: Record<string, number> = \{([\s\S]*?)\};/)![1].replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries([...body.matchAll(/(\w+):\s*([\d.]+)/g)].map(m => [m[1], Number(m[2])])) as Record<string, number>;
};
const toNum = (v: unknown): number | null => (v == null ? null : isFinite(Number(v)) ? Number(v) : null);

// 1. migration vs live
const dir = "../../../migrations/";
const up = read(dir + "20261006203000_shoulder_er_target_85.sql");
const rb = read(dir + "20261006203000_shoulder_er_target_85.rollback.sql.txt");
const prev = read(dir + "20261006153000_steady_targets_hip_shoulder_ankle.sql");
const defs = (t: string) => [...t.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$function\$;/g)]
  .map(m => ({ name: m[1], text: m[0].replace(/;$/, "") + "\n" }));
const LIVE_MD5: Record<string, string> = {
  compute_joint_scores: "cb9b01cb43608057b79f390f77c77943",
  protocol_joint_ranking: "58fd8eea5744df85e33a1e312ddbb1a9",
};
const upDefs = defs(up), rbDefs = defs(rb), prevDefs = defs(prev);
assert.deepEqual(upDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
assert.deepEqual(rbDefs.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
for (const [i, d] of rbDefs.entries()) {
  assert.equal(createHash("md5").update(d.text).digest("hex"), LIVE_MD5[d.name], `rollback ${d.name} = live`);
  assert.equal(d.text, prevDefs[i].text, `rollback ${d.name} = the applied 20261006153000 body`);
}
const changed = (i: number) => {
  const u = upDefs[i].text.split("\n"), l = rbDefs[i].text.split("\n");
  assert.equal(u.length, l.length);
  const norm = (x: string) => x.trim().replace(/(\S)\s+-- .*$/, "$1");
  return u.map((x, k) => [norm(x), norm(l[k])]).filter(([x, y]) => x !== y);
};
assert.deepEqual(changed(0), [["('shoulder_er','shoulder_er_l','shoulder_er_r',85),", "('shoulder_er','shoulder_er_l','shoulder_er_r',40),"]]);
assert.deepEqual(changed(1), [["(5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 85, 85),", "(5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 40),"]]);
assert.ok(!/techniques|recompute_user_eligibility/.test(up.replace(/^--.*$/gm, "")), "no technique minimum change");

// 2. edge mirrors
const T = parse(read("../index.ts"));
assert.match(read("../index.ts"), /^\/\/ compute-tiers v40 /);
assert.deepEqual([T.shoulder_er_l, T.shoulder_er_r], [85, 85]);
assert.deepEqual([T.hip_er_l, T.hip_ir_l, T.hip_abd_l, T.shoulder_flex_l, T.ankle_df_l, T.cervical_rot_l, T.cervical_lat_l, T.hip_flex_l, T.cervical_flex, T.cervical_ext, T.lumbar_flex, T.lumbar_ext],
  [29, 26, 40, 140, 6, 70, 38, 120, 50, 60, 60, 25], "every other target unchanged");
assert.ok(/\{ target: 85, key: "shoulder_er"/.test(read("../../submit-lead-assessment/email.ts")));
const lead = parse(read("../../submit-lead-assessment/index.ts"));
assert.deepEqual([lead.shoulder_er_l, lead.shoulder_er_r], [85, 85]);

// 3. behaviour at 85
assert.equal(overallBandScore({ shoulder_er_l: 85, shoulder_er_r: 90 }), 3);
assert.equal(overallBandScore({ shoulder_er_l: 76.5, shoulder_er_r: 90 }), 2);
assert.equal(overallBandScore({ shoulder_er_l: 76, shoulder_er_r: 90 }), 1);
assert.equal(overallBandScore({ shoulder_er_l: 55, shoulder_er_r: 52 }), 1, "a tucked-elbow-size reading is Needs focus at 85");
assert.deepEqual(jointPercents({ shoulder_er_l: 42.5 }).shoulder_er, { pct: 50, band: 1 });
assert.equal(mobilityScore({ shoulder_er_l: 85, shoulder_er_r: 85 }), 100);
assert.deepEqual(worstJointKeys({ shoulder_er_l: 84, shoulder_flex_l: 140, cervical_rot_l: 70 }, T, toNum, 1), ["shoulder_er_l"]);
assert.equal(romTotal({ shoulder_er_l: 110, shoulder_er_r: 85 }, T, toNum), 100);

// 4. recompute script: guarded, backup table, A / B / C, only shoulder_er
const rc = read("../../../../scripts/one-time/20261006_recompute_shoulder_er_85.sql");
assert.ok(rc.includes("(''shoulder_er'',''shoulder_er_l'',''shoulder_er_r'',85)"), "guard checks the new compute_joint_scores body");
assert.ok(rc.includes("(5, ''shoulder_er'', ''shoulder_er_l'', ''shoulder_er_r'', NULL, 85, 85)"), "guard checks the new protocol_joint_ranking body");
assert.ok(rc.includes("_recompute_shoulder_er_85_20261006_backup"));
for (const s of ["-- A. DRY RUN", "-- B. APPLY", "-- C. ROLLBACK", "ROW LEVEL SECURITY", "measured angles changed"]) assert.ok(rc.includes(s), s);
console.log("compute-tiers shoulder_er_85 tests: ok");
