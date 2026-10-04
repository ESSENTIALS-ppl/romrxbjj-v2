import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRequirements, classifyMove, UNSOURCED_GREY_SWITCH, UNSOURCED_MARK_BEATS_SLR_OVERRIDE, type SourceMark } from "../rule.ts";

// BB unsourced grey (DRAFT). Quinn's peer review: a marked number is GREY, reason no_reference_range, reusing PR #74's mechanism.
assert.equal(UNSOURCED_GREY_SWITCH, true);                 // default ON
assert.equal(UNSOURCED_MARK_BEATS_SLR_OVERRIDE, false);    // default: hip flexion keeps the Base straight-leg color

const bb = (mins: Record<string, number>, marks?: SourceMark[], on = true) => buildRequirements([], mins, marks, on);
const strong = { shoulder_er_l: 120, shoulder_er_r: 120, shoulder_flex_l: 180, shoulder_flex_r: 180, lumbar_flex: 80, lumbar_ext: 40, ankle_df_l: 14, ankle_df_r: 14 };
const weak = { ...strong, shoulder_er_l: 20, shoulder_er_r: 20 };
const mk = (joint: string, v: number, s = "unsourced"): SourceMark => ({ joint, app_value: v, source_status: s });

// 1. no marks = behaviour of PR #74 (BB keeps its legacy numbers)
let r = classifyMove(strong, bb({ shoulder_er_min: 90, shoulder_flex_min: 150 }));
assert.deepEqual([r.tier, r.grey_reason], ["GREEN", null]);

// 2. a marked number is GREY / no_reference_range even for a very flexible athlete (never GREEN), and shows names only
r = classifyMove(strong, bb({ shoulder_er_min: 90, shoulder_flex_min: 150 }, [mk("shoulder_er", 90)]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);
assert.deepEqual(r.joint_status.map(j => [j.joint, j.status]), [["shoulder_er", "GREY"], ["shoulder_flex", "GREEN"]]);
assert.deepEqual(r.limiting, ["shoulder_er:no_reference_range"]);

// 3. never RED from an unsourced number, even when the athlete is far below it
r = classifyMove(weak, bb({ shoulder_er_min: 90 }, [mk("shoulder_er", 90)]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);

// 4. a real RED on a kept (sourced) joint still wins over the grey joint
r = classifyMove({ ...strong, lumbar_flex: 5 }, bb({ shoulder_er_min: 90, lumbar_flex_min: 35 }, [mk("shoulder_er", 90)]));
assert.deepEqual([r.tier, r.grey_reason], ["RED", null]);
assert.deepEqual(r.joint_status.map(j => j.status), ["GREY", "RED"]);

// 5. YELLOW on a kept joint + marked joint = GREY (GREY_BEATS_YELLOW default)
r = classifyMove({ ...strong, lumbar_flex: 28 }, bb({ shoulder_er_min: 90, lumbar_flex_min: 35 }, [mk("shoulder_er", 90)]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);

// 6. the mark is tied to the number: if the live number changed (sourced / corrected), it is graded normally again
r = classifyMove(strong, bb({ shoulder_er_min: 95 }, [mk("shoulder_er", 90)]));
assert.deepEqual([r.tier, r.grey_reason], ["GREEN", null]);
// a mark on a different joint does nothing; joint spellings are normalized
r = classifyMove(strong, bb({ shoulder_er_min: 90 }, [mk("lumbar_flex", 90)]));
assert.equal(r.tier, "GREEN");
r = classifyMove(strong, bb({ shoulder_er_min: 90 }, [mk("Shoulder ER", "90" as unknown as number)]));
assert.equal(r.tier, "GREY");

// 7. the switch off = ignore all marks
r = classifyMove(strong, bb({ shoulder_er_min: 90 }, [mk("shoulder_er", 90)], false));
assert.equal(r.tier, "GREEN");

// 8. contradicted numbers are greyed too (Quinn gives published PEAKS, not a sourced minimum, so no number is corrected)
r = classifyMove(strong, bb({ shoulder_er_min: 90 }, [mk("shoulder_er", 90, "contradicted")]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);

// 9. hip flexion on a move keeps the Base straight-leg color by default (sourced norm), even if the move's number is marked;
//    with the switch on, the mark wins and the joint is GREY
const ov = { hip_flex: { basis: "slr_norm" as const, left: "GREEN" as const, right: "GREEN" as const } };
const hf = bb({ hip_flex_min: 115 }, [mk("hip_flex", 115, "contradicted")]);
r = classifyMove(strong, hf, null, ov);
assert.deepEqual([r.tier, r.joint_status[0].basis], ["GREEN", "slr_norm"]);
r = classifyMove(strong, hf, null, ov, true);
assert.deepEqual([r.tier, r.grey_reason, r.joint_status[0].basis], ["GREY", "no_reference_range", undefined]);

// 10. ankle: a marked ankle number is already GREY (unit pending); the reason stays no_reference_range
r = classifyMove(strong, bb({ ankle_df_min: 15 }, [mk("ankle_df", 15)]));
assert.deepEqual([r.tier, r.grey_reason], ["GREY", "no_reference_range"]);

// 11. no rule at all is still no_rule (forearm lifts), not changed by this branch
assert.deepEqual(classifyMove(strong, bb({}, [mk("shoulder_er", 90)])).grey_reason, "no_rule");

// ---- data checks: the list CSV, the migration and Quinn's counts agree ----
const here = process.cwd() + "/test/";   // run from supabase/functions/compute-tiers (see test/README.md)
const csv = readFileSync(here + "../../../../docs/color-rule-drafts/bb-unsourced-grey/bb-unsourced-grey-list.csv", "utf8").trim().split("\n");
const header = csv[0].split(",");
assert.equal(csv.length - 1, 499);
const parseRow = (line: string) => { const out: string[] = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
const rows = csv.slice(1).map(l => Object.fromEntries(parseRow(l).map((v, i) => [header[i], v])));
const count = (f: (r: Record<string, string>) => boolean) => rows.filter(f).length;
assert.equal(count(r => r.quinn_verdict === "UNSOURCED"), 442);
assert.equal(count(r => r.quinn_verdict === "CONTRADICTS"), 7);
assert.equal(count(r => r.quinn_verdict === "SUPPORTS"), 15);
assert.equal(count(r => r.quinn_verdict === "PARTIAL/NOT COMPARABLE"), 35);
assert.equal(count(r => r.action === "grey"), 449);
assert.equal(count(r => r.action === "keep"), 50);
assert.equal(count(r => r.source_status === "unsourced"), 442);
assert.equal(count(r => r.source_status === "contradicted"), 7);
assert.ok(rows.filter(r => r.quinn_verdict === "CONTRADICTS").every(r => r.joint_key === "hip_flex" && Number(r.app_value) >= 100));
assert.equal(new Set(rows.map(r => r.technique_code + "|" + r.joint_key)).size, 499);   // one number per move + joint
const byJoint: Record<string, number> = {}; for (const r of rows) byJoint[r.joint_key] = (byJoint[r.joint_key] ?? 0) + 1;
assert.deepEqual(byJoint, { hip_flex: 112, shoulder_flex: 112, lumbar_flex: 112, shoulder_er: 86, ankle_df: 48, lumbar_ext: 29 });
const mig = readFileSync(here + "../../../migrations/20261004010000_bb_unsourced_grey.sql", "utf8");
const rb = readFileSync(here + "../../../migrations/20261004010000_bb_unsourced_grey.rollback.sql.txt", "utf8");
const tuples = mig.match(/^  \('bb_[^']+','[a-z_]+','[a-z]+',[0-9.]+,'(?:unsourced|contradicted)','[^']+'\)/gm) ?? [];
assert.equal(tuples.length, 449);
for (const g of rows.filter(r => r.action === "grey")) {
  assert.ok(mig.includes(`('${g.technique_code}','${g.joint_key}','${g.tier}',${g.app_value},'${g.source_status}','${g.quinn_verdict}')`), g.technique_code + g.joint_key);
}
assert.ok(/CREATE TABLE IF NOT EXISTS public\.rom_number_source_status/.test(mig) && /ON CONFLICT \(sport, technique_code, joint\) DO UPDATE/.test(mig));
assert.ok(/DROP TABLE IF EXISTS public\.rom_number_source_status/.test(rb) && !/rom_number_source_status mk/.test(rb));
assert.ok(!/UPDATE public\.techniques|DELETE FROM|DROP TABLE public\.(techniques|rom_thresholds)/i.test(mig));   // no technique number is changed
console.log("ok unsourced_grey: rule + data (499 / 442 / 7 / 449 grey / 50 keep)");
