// The score the apps show (Stacy, Nov 2 2026 6:44 PM): THE /100 mobility score computed by the SAME code the apps use
// (_shared/mobility/mobilityBands.ts is a verbatim copy of Base app/src/lib/mobilityBands.ts, same code as the BJJ and BB copies),
// NOT assessments.rom_total. Older assessments are treated as the apps treat them: assessments saved before the hip flexion
// cutover (scoring_cutovers.hip_flex_scored) have hip flexion taken out. Cutover unknown = everything pre-cutover, as the apps do.
import { mobilityScoreForAssessment } from "../_shared/mobility/mobilityBands.ts";

/** Columns the score reads. Pinned, no select("*"). */
export const SCORE_COLUMNS = [
  "id", "assessed_at", "created_at",
  "hip_er_l", "hip_er_r", "hip_ir_l", "hip_ir_r", "hip_abd_l", "hip_abd_r", "hip_flex_l", "hip_flex_r",
  "shoulder_er_l", "shoulder_er_r", "shoulder_flex_l", "shoulder_flex_r", "ankle_df_l", "ankle_df_r",
  "cervical_rot_l", "cervical_rot_r", "cervical_lat_l", "cervical_lat_r", "cervical_flex", "cervical_ext",
  "lumbar_flex", "lumbar_ext",
] as const;

/** Same rule as the apps' hipFlexScoredFor / readiness.scoredView. */
export function appScore(a: Record<string, unknown>, hipFlexCutoverMs: number | null): number {
  let view = a;
  const t = Date.parse(String(a.assessed_at ?? a.created_at ?? ""));
  const scored = hipFlexCutoverMs != null && (!Number.isFinite(t) || t >= hipFlexCutoverMs);
  if (!scored) { const { hip_flex_l: _l, hip_flex_r: _r, ...rest } = a; void _l; void _r; view = rest; }
  return mobilityScoreForAssessment(view);
}

/** The label the apps put on this number: BJJ and BB My Body show "Position Readiness Score", Base My Body shows "Body score". ONE place. */
export const SCORE_LABEL: Record<"bjj" | "bodybuilding" | "base", string> = {
  bjj: "Position Readiness Score", bodybuilding: "Position Readiness Score", base: "Body score",
};

// P1-06 must-fix (b): the newest two FULL assessments. Quick re-checks (check_kind = 'quick') carry no full score and must not
// become "latest" or "previous". Filter = check_kind IS DISTINCT FROM 'quick' (NULL counts as full). If the filtered read errors
// (column not there yet, before 20261116031000 is applied) it falls back to the unfiltered read used before.
// deno-lint-ignore no-explicit-any
export async function latestTwoFull(sb: any, userId: string): Promise<Record<string, unknown>[]> {
  const q = () => sb.from("assessments").select(SCORE_COLUMNS.join(", ")).eq("user_id", userId);
  const f = await q().or("check_kind.is.null,check_kind.neq.quick").order("assessed_at", { ascending: false }).limit(2);
  if (!f.error) return (f.data ?? []) as Record<string, unknown>[];
  const u = await q().order("assessed_at", { ascending: false }).limit(2);
  return (u.data ?? []) as Record<string, unknown>[];
}
