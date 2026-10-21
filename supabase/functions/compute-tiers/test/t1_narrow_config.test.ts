// T1 narrowed buffers (Jim 11:47 AM ET Oct 21; Quinn t1-quinn-buffers.md 11:47:58 AM ET). The ONE shared config feeds
// compute-tiers and the lead email, and the SQL migration carries the same table.
// Run: deno run -A supabase/functions/compute-tiers/test/t1_narrow_config.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NARROW_BAND_CONFIG, bandForJoint } from "../joint_totals.ts";
import { jointPercents, mobilityScore } from "../../submit-lead-assessment/email.ts";
const here = new URL(".", import.meta.url).pathname;
const sql = readFileSync(here + "../../../migrations/20261021150000_t1_narrow_bands.sql", "utf8");
const rows = [...sql.matchAll(/\('(\w+)',\s+([\d.]+)(?:::numeric)?,\s+([\d.]+)(?:::numeric)?\)/g)].map(m => [m[1], { steady: Number(m[2]), building: Number(m[3]) }]);
assert.deepEqual(Object.fromEntries(rows), JSON.parse(JSON.stringify(NARROW_BAND_CONFIG)), "SQL t1_narrow_buffer table = shared TS config");
const T: Record<string, number> = { hip_er: 29, hip_ir: 26, hip_abd: 40, cervical_flex: 50, cervical_lat: 38 };
for (const [k, t] of Object.entries(T)) {
  const s = NARROW_BAND_CONFIG[k].steady;
  assert.equal(NARROW_BAND_CONFIG[k].building, 0, `${k} has no Building-line buffer`);
  assert.ok(s < 0.1 * t, `${k} buffer ${s} is under the Building band ${0.1 * t}`);
  assert.equal(bandForJoint(k, 0.9 * t, t), 2, `${k} 90% point stays Building`);
  assert.equal(bandForJoint(k, t - s, t), 3, `${k} buffered Steady`);
  assert.ok(jointPercents({ [k === "cervical_flex" ? "cervical_flex" : `${k}_l`]: t - s })[k].pct < 100, `${k} buffered Steady shows real %`);
}
assert.equal(mobilityScore({ hip_er_l: 27.5, hip_er_r: 29 }), 94, "buffered Steady /100 is the real number");
console.log("compute-tiers t1_narrow_config tests: ok");
