// Range reset (Jim Oct 21 2026 4:15 PM ET; proof-20261020/range-proposal.md). Checks that migration 20261021203000 (NOT applied)
// differs from the LIVE definitions (read with SELECT only, Oct 21 2026) on exactly the reset target lines, that the rollback is
// the live text byte for byte, and that SQL, compute-tiers and the lead email agree. Run: deno run -A <this file>
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const dir = "../../../migrations/";
const up = read(dir + "20261021203000_range_reset_pooled.sql");
const rb = read(dir + "20261021203000_range_reset_pooled.rollback.sql.txt");
const defs = (t: string) => [...t.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$function\$\n?;/g)]
  .map(m => ({ name: m[1], text: m[0].replace(/\n?;$/, "") + "\n" }));
const LIVE_MD5: Record<string, string> = { compute_joint_scores: "49f15fc3737b31ddf003342d21d313f1", protocol_joint_ranking: "eb0f00cad6ea6d1cc170b8ce289e0437" };
const u = defs(up), r = defs(rb);
assert.deepEqual(u.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
assert.deepEqual(r.map(d => d.name), ["compute_joint_scores", "protocol_joint_ranking"]);
for (const d of r) assert.equal(createHash("md5").update(d.text).digest("hex"), LIVE_MD5[d.name], `rollback ${d.name} = live`);
const norm = (x: string) => x.trim().replace(/(\S)\s+-- .*$/, "$1");
const changed = (i: number) => {
  const a = u[i].text.split("\n"), b = r[i].text.split("\n");
  assert.equal(a.length, b.length);
  return a.map((x, k) => [norm(x), norm(b[k])]).filter(([x, y]) => x !== y);
};
assert.deepEqual(changed(0), [
  ["('hip_er','hip_er_l','hip_er_r',23::numeric),", "('hip_er','hip_er_l','hip_er_r',29::numeric),"],
  ["('hip_ir','hip_ir_l','hip_ir_r',24),", "('hip_ir','hip_ir_l','hip_ir_r',26),"],
  ["('shoulder_flex','shoulder_flex_l','shoulder_flex_r',141),", "('shoulder_flex','shoulder_flex_l','shoulder_flex_r',140),"],
  ["('ankle_df','ankle_df_l','ankle_df_r',6.1),", "('ankle_df','ankle_df_l','ankle_df_r',6),"],
  ["('cervical_lat','cervical_lat_l','cervical_lat_r',37)", "('cervical_lat','cervical_lat_l','cervical_lat_r',38)"],
  ["('cervical_flex','cervical_flex',39),", "('cervical_flex','cervical_flex',50),"],
  ["('cervical_ext','cervical_ext',48)", "('cervical_ext','cervical_ext',60)"],
]);
assert.deepEqual(changed(1), [
  ["(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 23::numeric, 23::numeric),", "(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 29::numeric, 29::numeric),"],
  ["(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 24, 24),", "(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 26, 26),"],
  ["(6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 141, 141),", "(6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 140),"],
  ["(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 6.1, 6.1),", "(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 6, 6),"],
  ["(11, 'cervical_ext', NULL, NULL, 'cervical_ext', 48, 48),", "(11, 'cervical_ext', NULL, NULL, 'cervical_ext', 60, 60),"],
  ["(12, 'cervical_flex', NULL, NULL, 'cervical_flex', 39, 39),", "(12, 'cervical_flex', NULL, NULL, 'cervical_flex', 50, 50),"],
  ["(13, 'cervical_lat', 'cervical_lat_l', 'cervical_lat_r', NULL, 37, 37)", "(13, 'cervical_lat', 'cervical_lat_l', 'cervical_lat_r', NULL, 38, 38)"],
]);
assert.ok(!/techniques|recompute_user_eligibility|UPDATE public\./.test(up.replace(/^--.*$/gm, "")), "no technique minimum or data change");
assert.ok(/0\.90 THEN 2/.test(u[0].text), "90% Building rule unchanged");
assert.ok(/shoulder_er','shoulder_er_l','shoulder_er_r',85\)/.test(u[0].text) && /'hip_abd','hip_abd_l','hip_abd_r',40\)/.test(u[0].text) && /'hip_flex','hip_flex_l','hip_flex_r',120\)/.test(u[0].text), "shoulder ER, hip abd, hip flex untouched");
console.log("compute-tiers range_reset_pooled tests: ok");
