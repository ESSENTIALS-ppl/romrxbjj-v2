// Saved-score rescore migration (Jim Oct 21 2026 4:49 PM ET via Grant). Static checks; the full run is the local
// PGlite simulation in /workspace/rescore-20261021/sim (live snapshot, rollback hash compare).
// Run: deno run -A supabase/functions/compute-tiers/test/rescore_saved.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const M = here + "../../../migrations/";
const up = readFileSync(M + "20261021220000_rescore_saved.sql", "utf8");
const rb = readFileSync(M + "20261021220000_rescore_saved.rollback.sql.txt", "utf8");
const body = (s: string) => s.replace(/^\s*--.*$/gm, "");
const files = readFileSync(here + "../index.ts", "utf8");
// ordering + guard
assert.ok("20261021220000" > "20261021210000");
assert.match(up, /t1_joint_band/, "refuses unless T1 compute_joint_scores is applied");
assert.match(up, /''hip_er'',''hip_er_l'',''hip_er_r'',23/, "refuses unless reset targets are present");
assert.match(up, /tgtype & \(8 \| 16 \| 32\)/, "refuses if any UPDATE/DELETE/TRUNCATE trigger exists on assessments");
assert.match(up, /relname IN \('joint_scores', 'protocols'\)/, "refuses if any trigger exists on joint_scores / protocols");
// backups: all columns, before any write
for (const t of ["assessments", "joint_scores", "protocols"]) {
  const i = up.indexOf(`CREATE TABLE public.rescore_backup_20261021_${t} AS SELECT * FROM public.${t};`);
  assert.ok(i > 0 && i < up.indexOf("UPDATE public.assessments"), `${t} backed up (all columns) before the rescore`);
  assert.match(up, new RegExp(`rescore_backup_20261021_${t} ENABLE ROW LEVEL SECURITY`));
}
// no side-effect paths
assert.ok(!/net\.http|http_request|functions\/v1|email_sends|notification|pg_notify|INSERT INTO public\.assessments/i.test(body(up)), "no http, edge, email or notify calls");
assert.ok(!/net\.http|http_request|functions\/v1|email_sends|notification|pg_notify|INSERT INTO public\.assessments/i.test(body(rb)), "rollback: none either");
assert.ok(!/techniques|technique_eligibility/.test(body(up)), "eligibility untouched");
// SQL mirror of compute-tiers JOINT_TARGETS (order and values)
const ts = files.match(/const JOINT_TARGETS: Record<string, number> = \{([\s\S]*?)\};/)![1].replace(/\/\/.*$/gm, "");
const tsPairs = [...ts.matchAll(/(\w+):\s*([\d.]+)/g)].map(m => `${m[1]}=${Number(m[2])}`);
const sqlPairs = [...up.matchAll(/\(\d+,'(\w+)',([\d.]+)(?:::numeric)?\)/g)].map(m => `${m[1]}=${Number(m[2])}`);
assert.deepEqual(sqlPairs, tsPairs, "SQL target list = compute-tiers JOINT_TARGETS, same order");
assert.match(up, /LIMIT 5/); assert.match(up, /hip_flex/);
// rollback restores exactly from the backups, only for backed-up assessments
assert.match(rb, /SET worst_joints = b\.worst_joints, rom_total = b\.rom_total/);
assert.match(rb, /INSERT INTO public\.joint_scores SELECT \* FROM public\.rescore_backup_20261021_joint_scores;/);
assert.match(rb, /INSERT INTO public\.protocols SELECT \* FROM public\.rescore_backup_20261021_protocols;/);
assert.match(up, /DROP FUNCTION public\.rescore_20261021_totals\(uuid\);/, "temp helper dropped");
console.log("compute-tiers rescore_saved tests: ok");
