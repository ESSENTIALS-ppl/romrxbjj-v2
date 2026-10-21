// T1 rebased on the range reset (Jim 4:38 PM ET Oct 21: "Drop the T1 buffers on the reset moves"). The ONE shared config feeds
// compute-tiers and the lead email, and SQL migration 20261021210000_t1_rebased.sql carries the same table.
// Run: deno run -A supabase/functions/compute-tiers/test/t1_narrow_config.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NARROW_BAND_CONFIG, bandForJoint, isNarrowJoint } from "../joint_totals.ts";
import { jointPercents, mobilityScore } from "../../submit-lead-assessment/email.ts";
const here = new URL(".", import.meta.url).pathname;
const mig = here + "../../../migrations/";
const sql = readFileSync(mig + "20261021210000_t1_rebased.sql", "utf8");
const reset = readFileSync(mig + "20261021203000_range_reset_pooled.sql", "utf8");
const rb = readFileSync(mig + "20261021210000_t1_rebased.rollback.sql.txt", "utf8");
const rows = [...sql.matchAll(/\('(\w+)',\s+([\d.]+)(?:::numeric)?,\s+([\d.]+)(?:::numeric)?\)/g)].map(m => [m[1], { steady: Number(m[2]), building: Number(m[3]) }]);
assert.deepEqual(Object.fromEntries(rows), JSON.parse(JSON.stringify(NARROW_BAND_CONFIG)), "SQL t1_narrow_buffer table = shared TS config");
assert.deepEqual(Object.keys(NARROW_BAND_CONFIG).sort(), ["cervical_rot", "hip_abd", "shoulder_er"], "buffers only on joints the reset did not change");
// compute_joint_scores in the T1 migration = post-reset body with ONLY the score line changed
const cjs = (s: string) => s.slice(s.indexOf("CREATE OR REPLACE FUNCTION public.compute_joint_scores"), s.indexOf("$function$;", s.indexOf("CREATE OR REPLACE FUNCTION public.compute_joint_scores")));
const resetBody = cjs(reset), t1Body = cjs(sql);
const diff = resetBody.split("\n").filter((l, i) => l !== t1Body.split("\n")[i]);
assert.equal(resetBody.split("\n").length, t1Body.split("\n").length);
assert.equal(diff.length, 1, "only the score CASE line differs");
assert.match(t1Body, /public\.t1_joint_band\(joint_key, worse, target\) AS score/);
for (const t of ["'hip_er_r',23::numeric", "'hip_ir_r',24)", "'shoulder_flex_r',141)", "'ankle_df_r',6.1)", "'cervical_lat_r',37)", "'cervical_flex',39)", "'cervical_ext',48)"]) {
  assert.ok(t1Body.includes(t), `NEW target kept: ${t}`);
}
assert.equal(cjs(rb), resetBody, "rollback restores the exact post-reset compute_joint_scores body");
const T: Record<string, number> = { hip_er: 23, hip_ir: 24, shoulder_flex: 141, ankle_df: 6.1, cervical_lat: 37, cervical_flex: 39, cervical_ext: 48 };
for (const [k, t] of Object.entries(T)) {
  assert.equal(isNarrowJoint(k), false, `${k} has no buffer`);
  assert.equal(bandForJoint(k, t, t), 3);
  assert.equal(bandForJoint(k, t - 0.01, t), 2);
  assert.equal(bandForJoint(k, Number((0.9 * t).toFixed(6)), t), 2, `${k} exactly 90% is Building (fixed point)`);
  assert.equal(bandForJoint(k, 0.9 * t - 0.01, t), 1);
}
assert.equal(bandForJoint("cervical_lat", 33.3, 37), 2, "90%-edge fix: 33.3 / 37 is Building like SQL numeric");
assert.equal(bandForJoint("hip_abd", 38, 40), 3, "hip abd buffer 2 kept");
assert.equal(bandForJoint("shoulder_er", 71.5, 85), 2, "shoulder ER Building-line buffer 5 kept");
assert.ok(jointPercents({ hip_abd_l: 38, hip_abd_r: 40 }).hip_abd.pct < 100, "buffered Steady shows real %");
assert.equal(mobilityScore({ hip_abd_l: 38, hip_abd_r: 40 }), 95, "buffered Steady /100 is the real number");
console.log("compute-tiers t1_narrow_config tests: ok");
