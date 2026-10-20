// Move colour rule (Jim ledger L128, L129, L135, closed Oct 3 2026).
// L128: move color = WORST measured required joint. Missing joint or no rule = grey "Not rated", NEVER GREEN.
// L129: YELLOW band = flat 10 degrees (ankle 2 cm), NOT the 90% ratio.
// Run: deno run -A supabase/functions/compute-tiers/test/move_colour.test.ts
import assert from "node:assert/strict";
import { classify, yellowMargin } from "../move_colour.ts";

const t = (mins: Record<string, number | null>) => Object.fromEntries(Object.entries(mins).map(([k, v]) => [k + "_min", v]));

// L128: no rule = GREY, never GREEN
assert.equal(classify({ hip_er_l: 50, hip_er_r: 50 }, t({})).tier, "GREY");
assert.equal(classify({ hip_er_l: 50 }, t({ hip_er: 0, hip_ir: null })).tier, "GREY");
// L128: a missing required joint = GREY, even if the others pass
const m = classify({ hip_er_l: 60, hip_er_r: 60 }, t({ hip_er: 30, shoulder_er: 80 }));
assert.equal(m.tier, "GREY");
assert.ok(m.limiting.some(l => l.joint === "shoulder_er" && l.reason === "not_measured"));
// missing joint stays GREY even when another joint is RED (never a colour from a partial set)
assert.equal(classify({ hip_er_l: 5, hip_er_r: 5 }, t({ hip_er: 30, shoulder_er: 80 })).tier, "GREY");

// L129: flat 10 deg yellow, not 90%
assert.equal(classify({ shoulder_er_l: 85, shoulder_er_r: 85 }, t({ shoulder_er: 85 })).tier, "GREEN");
assert.equal(classify({ shoulder_er_l: 75, shoulder_er_r: 90 }, t({ shoulder_er: 85 })).tier, "YELLOW"); // 10 below, ratio 0.88 (was RED)
assert.equal(classify({ shoulder_er_l: 74, shoulder_er_r: 90 }, t({ shoulder_er: 85 })).tier, "RED");    // 11 below
assert.equal(classify({ hip_er_l: 20, hip_er_r: 20 }, t({ hip_er: 29 })).tier, "YELLOW");               // 9 below, ratio 0.69 (was RED)
assert.equal(classify({ shoulder_flex_l: 128, shoulder_flex_r: 128 }, t({ shoulder_flex: 140 })).tier, "RED"); // 12 below, ratio 0.914 (was YELLOW)
// ankle: 2 cm
assert.equal(yellowMargin("ankle_df"), 2);
assert.equal(yellowMargin("hip_er"), 10);
assert.equal(classify({ ankle_df_l: 4, ankle_df_r: 7 }, t({ ankle_df: 6 })).tier, "YELLOW");
assert.equal(classify({ ankle_df_l: 3.9, ankle_df_r: 7 }, t({ ankle_df: 6 })).tier, "RED");
assert.equal(classify({ ankle_df_l: 6, ankle_df_r: 7 }, t({ ankle_df: 6 })).tier, "GREEN");

// L128: worst measured required joint wins
const w = classify({ hip_er_l: 40, hip_er_r: 40, shoulder_er_l: 70, shoulder_er_r: 70, ankle_df_l: 5, ankle_df_r: 5 },
  t({ hip_er: 29, shoulder_er: 85, ankle_df: 6 }));
assert.equal(w.tier, "RED");
assert.deepEqual(w.limiting.map(l => l.joint), ["shoulder_er"]);
const y = classify({ hip_er_l: 40, hip_er_r: 40, ankle_df_l: 5, ankle_df_r: 5 }, t({ hip_er: 29, ankle_df: 6 }));
assert.equal(y.tier, "YELLOW");
assert.deepEqual(y.limiting.map(l => l.joint), ["ankle_df"]);

// worse side used for bilateral joints (unchanged)
assert.equal(classify({ hip_er_l: 10, hip_er_r: 60 }, t({ hip_er: 29 })).tier, "RED");

// index.ts no longer carries the 90% ratio and imports the shared rule
import { readFileSync } from "node:fs";
const idx = readFileSync(new URL("../index.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
assert.ok(!/0\.90/.test(idx), "no 0.90 in index.ts");
assert.ok(/from "\.\/move_colour\.ts"/.test(idx), "index.ts imports move_colour.ts");
assert.ok(/GREY:\s*0/.test(idx), "counts include GREY");
console.log("move_colour.test.ts: all passed");
