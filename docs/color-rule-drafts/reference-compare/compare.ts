// Runs the compute-tiers v43 engine (rule.ts + base_norms.ts) against Quinn's reference expected-moves CSV. Read-only.
import fs from "node:fs";
import { buildRequirements, classifyMove } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/rule.ts";
import { packRating } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/pack_rating.ts";
import { gradeBaseJoints, HIP_FLEX_MOVES_USE_SLR_COLOR } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/base_norms.ts";

const Q = "/workspace/quinn-research/";
const data = JSON.parse(fs.readFileSync(Q + "color_rules_data_20261003.json", "utf8"));
const users = JSON.parse(fs.readFileSync(Q + "color-rules-sample-users-20261003.json", "utf8")).users;

const KEY: Record<string, string> = {
  hip_er: "hip_er", hip_ir: "hip_ir", hip_flexion: "hip_flex", hip_abduction: "hip_abd", shoulder_er: "shoulder_er",
  shoulder_flexion: "shoulder_flex", ankle_df_cm: "ankle_df", lumbar_flexion: "lumbar_flex", lumbar_extension: "lumbar_ext",
  cervical_flexion: "cervical_flex", cervical_extension: "cervical_ext", cervical_lateral_flexion: "cervical_lat",
};
const SIDED = new Set(["hip_er", "hip_ir", "hip_flexion", "hip_abduction", "shoulder_er", "shoulder_flexion", "ankle_df_cm", "cervical_lateral_flexion"]);
const JOINTNAME: Record<string, string> = { ankle_df_cm: "Ankle DF (cm)", ankle_df_deg: "Ankle DF" };

function record(user: any, move: any): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  const vals = user.values || {};
  for (const [qk, ek] of Object.entries(KEY)) {
    let raw = vals[qk];
    if (user.probe) {
      const r = move.rules.find((x: any) => x.joint === qk && x.req != null);
      if (!r) continue;
      const off = qk === "ankle_df_cm" ? user.probe.cm : user.probe.deg;
      const bar = qk === "hip_flexion" ? (user.sex === "F" ? 66.8 : 61.7) : r.req; // SLR probe: relative to the sex GREEN edge, as the reference does
      raw = SIDED.has(qk) ? { L: bar + off, R: bar + off } : bar + off;
    }
    if (raw == null) continue;
    if (SIDED.has(qk)) { a[ek + "_l"] = raw.L ?? null; a[ek + "_r"] = raw.R ?? null; } else a[ek] = raw;
  }
  return a;
}
const out: string[] = ["user,pack,code,engine,engine_reason"];
const packs: string[] = ["user,pack,total,scored,green,almost,percent"];
const acc: Record<string, any[]> = {};
for (const user of users) {
  for (const pack of ["bjj", "bb"]) for (const move of data[pack]) {
    const a = record(user, move);
    const reqs = buildRequirements(move.rules.filter((r: any) => r.has_rule && r.req != null).map((r: any) => ({
      joint: JOINTNAME[r.joint] ?? r.joint, required_value: r.req, laterality_rule: r.side })));
    const g = gradeBaseJoints(user.sex === "M" ? "male" : user.sex === "F" ? "female" : null, a);
    const ov = HIP_FLEX_MOVES_USE_SLR_COLOR ? { hip_flex: { basis: "slr_norm" as const, left: g.hip_flex.left.status, right: g.hip_flex.right.status } } : undefined;
    const dom = user.dominant_side === "L" ? "left" : user.dominant_side === "R" ? "right" : null;
    const r = classifyMove(a, reqs, dom, ov);
    (acc[user.id + "|" + pack] ??= []).push(r);
    out.push([user.id, pack, move.code, r.tier, r.grey_reason ?? ""].join(","));
  }
}
fs.writeFileSync("/tmp/engine_moves.csv", out.join("\n") + "\n");
console.log("rows", out.length - 1);

for (const [k, ms] of Object.entries(acc)) { const [u, p] = k.split("|"); const pr = packRating(ms); packs.push([u, p, pr.total, pr.scored, pr.can_do, pr.almost, pr.pct ?? ""].join(",")); }
fs.writeFileSync("/tmp/engine_packs.csv", packs.join("\n") + "\n");
