import fs from "node:fs";
import { buildRequirements, classifyMove, athleteValue } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/rule.ts";
import { packRating } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/pack_rating.ts";
import { gradeBaseJoints, gradeHipFlexLeg, gradeHipFlexion } from "/workspace/wt-color-engine/supabase/functions/compute-tiers/base_norms.ts";
const lines = fs.readFileSync("/tmp/cases.json", "utf8"); const cases = JSON.parse(lines);
const KEY: Record<string, string> = { hip_er: "hip_er", hip_ir: "hip_ir", hip_flexion: "hip_flex", hip_abduction: "hip_abd", shoulder_er: "shoulder_er", shoulder_flexion: "shoulder_flex", ankle_df_cm: "ankle_df", lumbar_flexion: "lumbar_flex", lumbar_extension: "lumbar_ext", cervical_flexion: "cervical_flex", cervical_extension: "cervical_ext", cervical_lateral_flexion: "cervical_lat" };
const JN: Record<string, string> = { ankle_df_cm: "Ankle DF (cm)", ankle_df_deg: "Ankle DF" };
const sexOf = (s: any) => (s === "M" ? "male" : s === "F" ? "female" : null);
const dom = (d: any) => (d === "L" ? "left" : d === "R" ? "right" : null);
function rec(user: any) { const a: any = {}; for (const [k, v] of Object.entries<any>(user.values || {})) { const e = KEY[k]; if (!e) continue; if (v && typeof v === "object") { a[e + "_l"] = v.L ?? null; a[e + "_r"] = v.R ?? null; } else a[e] = v; } return a; }
const D = JSON.parse(fs.readFileSync("/workspace/quinn-research/color_rules_data_20261003.json", "utf8"));
const U = JSON.parse(fs.readFileSync("/workspace/quinn-research/color-rules-sample-users-20261003.json", "utf8")).users;
function runMove(user: any, move: any, cfg: any = {}) {
  if (typeof user === "string") user = U.find((x: any) => x.id === user);
  if (typeof move === "string") { const [p, c] = move.split(":"); move = D[p].find((m: any) => m.code === c); }
  const a = rec(user);
  const reqs = buildRequirements(move.rules.filter((r: any) => r.has_rule && r.req != null).map((r: any) => ({ joint: JN[r.joint] ?? r.joint, required_value: r.req, laterality_rule: r.side })));
  const mode = cfg.hip_flexion_variant === "sd" ? "published_sd" : "flat10";
  const g = { hip_flex: gradeHipFlexion(sexOf(user.sex), a.hip_flex_l, a.hip_flex_r, mode) };
  return classifyMove(a, reqs, dom(user.dominant_side), { hip_flex: { basis: "slr_norm", left: g.hip_flex.left.status, right: g.hip_flex.right.status } });
}
const res: any[] = [];
for (const c of cases) {
  const i = c.input;
  try {
    if (c.kind === "move") res.push([c.case_id, runMove(i.user, i.move, i.cfg || {}).tier, c.expected]);
    else if (c.kind === "slr") {
      const mode = i.variant === "sd" ? "published_sd" : "flat10";
      res.push([c.case_id, gradeHipFlexLeg(sexOf(i.sex), i.value, mode).status, c.expected]);
    } else if (c.kind === "pack") {
      const ms = i.moves.map((m: any) => runMove(i.user, m)); const p = packRating(ms);
      res.push([c.case_id, JSON.stringify({ total: p.total, scored: p.scored, green: p.can_do, almost: p.almost, percent: p.pct }), c.expected]);
    } else if (c.kind === "side") {
      const a: any = { hip_er_l: i.raw.L ?? null, hip_er_r: i.raw.R ?? null };
      res.push([c.case_id, athleteValue(a, "hip_er", i.rule, dom(i.dominant)), c.expected]);
    }
  } catch (e) { res.push([c.case_id, "ERR " + e, c.expected]); }
}
fs.writeFileSync("/tmp/case_out.json", JSON.stringify(res));
