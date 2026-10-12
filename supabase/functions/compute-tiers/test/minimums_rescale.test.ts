// Pack minimums rescale (Jim YES Oct 6 2026 12:10 PM; Quinn MINIMUMS-RESCALE-REC-QUINN-20261006.md + RESCALE-CALLS 12:25 PM).
// new minimum = round(old x new target / old target). Checks migration 20261012220000 (was 20261006170000) (techniques.*_min UPDATE, run-once guard,
// protocol_joint_ranking normal_min) and its rollback. Run: deno run -A supabase/functions/compute-tiers/test/minimums_rescale.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const dir = "../../../migrations/";
const up = read(dir + "20261012220000_pack_minimums_rescale.sql");
const rb = read(dir + "20261012220000_pack_minimums_rescale.rollback.sql.txt");
const prev = read(dir + "20261006203000_shoulder_er_target_85.sql");
const code = (s: string) => s.replace(/--.*$/gm, "");
const body0 = () => code(up);

// 1. ratios: exactly Quinn's list, nothing else
const RATIOS: Record<string, [number, number]> = {
  hip_er_min: [29, 45], hip_ir_min: [26, 45], shoulder_flex_min: [140, 180], hip_flex_min: [60, 120],
  ankle_df_min: [6, 20], cervical_rot_min: [70, 80], cervical_lat_min: [38, 45], shoulder_er_min: [85, 90],
};
const upd = code(up).match(/UPDATE public\.techniques SET([\s\S]*?)WHERE/)![1];
const set = [...upd.matchAll(/(\w+_min)\s*=\s*CASE WHEN coalesce\((\w+), 0\) <> 0\s+THEN round\((\w+) \* (\d+) \/ (\d+)\.0\)\s+ELSE (\w+) END/g)];
assert.deepEqual(Object.fromEntries(set.map(m => {
  assert.ok(m[1] === m[2] && m[2] === m[3] && m[3] === m[6], `same column throughout ${m[1]}`);
  return [m[1], [Number(m[4]), Number(m[5])]];
})), RATIOS, "UPDATE ratios = Quinn's list");
assert.ok(!/hip_abd_min|lumbar_\w+_min|cervical_(flex|ext)_min/.test(code(up)), "hip abd / lumbar / neck flex-ext untouched");
// summary counts use the same expression as the UPDATE
for (const [c, [n, d]] of Object.entries(RATIOS)) {
  assert.ok(code(up).includes(`round(${c} * ${n} / ${d}.0) <> ${c}`), `summary expression ${c}`);
}
// the WHERE covers exactly the 7 columns
const where = code(up).match(/UPDATE public\.techniques SET[\s\S]*?WHERE([\s\S]*?);/)![1];
assert.deepEqual([...where.matchAll(/coalesce\((\w+), 0\) <> 0/g)].map(m => m[1]).sort(), Object.keys(RATIOS).sort());

// 2. run-once guard + backup before the UPDATE
const body = code(up);
const iGuard = body.indexOf("IF EXISTS (SELECT 1 FROM public._minimums_rescale_20261006_log)");
const iBackup = body.indexOf("INSERT INTO public._minimums_rescale_20261006_backup");
const iUpdate = body.indexOf("UPDATE public.techniques SET");
const iLog = body.indexOf("INSERT INTO public._minimums_rescale_20261006_log");
assert.ok(iGuard > 0 && iGuard < iBackup && iBackup < iUpdate && iUpdate < iLog, "guard -> backup -> update -> log");
assert.ok(/RETURN;/.test(body.slice(iGuard, iBackup)), "guard returns early");
for (const t of ["_minimums_rescale_20261006_backup", "_minimums_rescale_20261006_log"]) {
  assert.ok(body.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`), `${t} RLS`);
  assert.ok(body.includes(`REVOKE ALL ON public.${t} FROM PUBLIC, anon, authenticated`), `${t} revoked`);
}

// 3. JS mirror of the value map (Math.round == postgres round for these positive values); Quinn's examples + every live value
const r = (v: number, c: string) => Math.round(v * RATIOS[c][0] / RATIOS[c][1]);
const MAP: Array<[string, number, number]> = [
  ["hip_er_min", 40, 26], ["hip_er_min", 45, 29], ["hip_er_min", 50, 32], ["hip_er_min", 55, 35], ["hip_er_min", 60, 39], ["hip_er_min", 65, 42], ["hip_er_min", 70, 45],
  ["hip_ir_min", 35, 20], ["hip_ir_min", 40, 23],
  ["shoulder_flex_min", 70, 54], ["shoulder_flex_min", 100, 78], ["shoulder_flex_min", 110, 86], ["shoulder_flex_min", 130, 101], ["shoulder_flex_min", 140, 109],
  ["shoulder_flex_min", 150, 117], ["shoulder_flex_min", 155, 121], ["shoulder_flex_min", 160, 124], ["shoulder_flex_min", 165, 128], ["shoulder_flex_min", 175, 136],
  ["hip_flex_min", 50, 25], ["hip_flex_min", 80, 40], ["hip_flex_min", 85, 43], ["hip_flex_min", 90, 45], ["hip_flex_min", 95, 48], ["hip_flex_min", 100, 50],
  ["hip_flex_min", 105, 53], ["hip_flex_min", 115, 58], ["hip_flex_min", 120, 60], ["hip_flex_min", 125, 63],
  // shoulder ER x 85/90 (Quinn Oct 6 8:19 PM: 50->47, 55->52, 60->57, 70->66, 85->80, 88->83; NOT x 40/90)
  ["shoulder_er_min", 50, 47], ["shoulder_er_min", 55, 52], ["shoulder_er_min", 60, 57], ["shoulder_er_min", 65, 61], ["shoulder_er_min", 70, 66],
  ["shoulder_er_min", 75, 71], ["shoulder_er_min", 80, 76], ["shoulder_er_min", 85, 80], ["shoulder_er_min", 88, 83],
  ["ankle_df_min", 10, 3], ["ankle_df_min", 12, 4], ["ankle_df_min", 15, 5], ["ankle_df_min", 16, 5], ["ankle_df_min", 20, 6],
  ["cervical_rot_min", 40, 35], ["cervical_lat_min", 25, 21], ["cervical_lat_min", 30, 25], ["cervical_lat_min", 35, 30], ["cervical_lat_min", 40, 34],
];
for (const [c, o, n] of MAP) assert.equal(r(o, c), n, `${c} ${o} -> ${n}`);
// a Base-Steady person now meets the old-target-level technique: old min == old target maps to the new target
assert.deepEqual([r(45, "hip_er_min"), r(45, "hip_ir_min"), r(180, "shoulder_flex_min"), r(20, "ankle_df_min"), r(80, "cervical_rot_min"), r(45, "cervical_lat_min"), r(90, "shoulder_er_min"), r(120, "hip_flex_min")],
  [29, 26, 140, 6, 70, 38, 85, 60]);

// 3b. ankle overrides after the ratio (Quinn 12:25), by code, exactly 1 row each, after the ratio UPDATE
const ov = [...code(up).matchAll(/\('(bb_quads_\w+)', (\d+)(?:::numeric)?\)/g)].map(m => [m[1], Number(m[2])]);
assert.deepEqual(ov, [
  ["bb_quads_wall_sit_isometric_026", 4], ["bb_quads_dumbbell_step_up_008", 4],
  ["bb_quads_cable_pull_through_squat_variation_013", 3], ["bb_quads_sissy_squat_bodyweight_025", 6],
]);
assert.ok(body0().indexOf("UPDATE public.techniques SET ankle_df_min = v_val") > body0().indexOf("UPDATE public.techniques SET\n"), "overrides run after the ratio");
assert.ok(/IF v_hit <> 1 THEN\s+RAISE EXCEPTION/.test(code(up)), "override must hit exactly 1 row");
assert.ok(!/dumbbell_sissy_squat_assisted_010/.test(code(up)), "assisted sissy squat 010 not overridden (ambiguous, flagged)");

// 4. protocol_joint_ranking: same as 20261006203000 except normal_min on 4 rows (shoulder_er already 85/85) (targets unchanged)
const defOf = (t: string) => t.slice(t.indexOf("CREATE OR REPLACE FUNCTION public.protocol_joint_ranking"), t.lastIndexOf("$function$;") + 11);
const norm = (x: string) => x.trim().replace(/(\S)\s+-- .*$/, "$1");
const diff = (a: string, b: string) => {
  const u = a.split("\n"), l = b.split("\n");
  assert.equal(u.length, l.length);
  return u.map((x, k) => [norm(x), norm(l[k])]).filter(([x, y]) => x !== y);
};
assert.deepEqual(diff(defOf(up), defOf(prev)), [
  ["(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 29::numeric, 29::numeric),", "(1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric, 29::numeric),"],
  ["(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 26, 26),", "(2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30, 26),"],
  ["(4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 60, 120),", "(4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 100, 120),"],
  ["(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 6, 6),", "(7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10, 6),"],
]);
// normal_min = Base target (Quinn 12:25 consistency rule), for every rescaled joint that has a ranking row; hip_flex = SLR target 60
const jd = [...defOf(up).matchAll(/\(\d+, '(\w+)', [^)]*?, (\d+)(?:::numeric)?, (\d+)(?:::numeric)?\)/g)].map(m => [m[1], Number(m[2]), Number(m[3])] as const);
for (const [k, nm, tg] of jd) {
  if (["hip_er", "hip_ir", "shoulder_er", "shoulder_flex", "ankle_df", "cervical_rot", "hip_abd"].includes(k)) assert.equal(nm, tg, `${k} normal_min = target`);
}
assert.deepEqual(jd.find(x => x[0] === "hip_flex"), ["hip_flex", 60, 120], "hip_flex normal_min 60 (SLR target); target column 120 inert while unscored");
assert.ok(/'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40\)/.test(defOf(up)), "hip abd untouched");
assert.ok(/\(5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 85, 85\)/.test(defOf(up)), "shoulder_er 85/85 kept");
assert.ok(!/compute_joint_scores/.test(code(up)), "compute_joint_scores not redefined here");

// 5. rollback: restores the 7 columns from the backup and the exact 20261006153000 protocol_joint_ranking
assert.equal(defOf(rb), defOf(prev), "rollback pjr = live 20261006203000 definition");
for (const c of Object.keys(RATIOS)) assert.ok(new RegExp(`${c} = b\\.${c}`).test(rb), `rollback restores ${c}`);
assert.ok(/shoulder_er_min\s+numeric/.test(up), "backup has shoulder_er_min");
assert.ok(/BEGIN;[\s\S]*COMMIT;/.test(rb) && /DROP TABLE public\._minimums_rescale_20261006_log/.test(rb));

// 6. compute-tiers has no minimum constants (minimums come from the techniques table)
const idx = read("../index.ts");
assert.ok(!/_min"?\s*:\s*\d/.test(code(idx)), "no hardcoded *_min in compute-tiers");
console.log("compute-tiers minimums_rescale tests: ok");
