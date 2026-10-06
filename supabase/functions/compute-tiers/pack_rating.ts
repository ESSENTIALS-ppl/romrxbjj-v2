// Per-sport-pack overall rating (Decision #5). DRAFT behind a flag, default OFF. Pure, node-testable.
//
// Jim said: the pack's overall rating is the PERCENT OF THAT SPORT'S MOVES THE USER CAN DO, from per-move colors.
// No shared AT RISK / ELITE label for the whole user. Per-position / technique labels stay as they are.
// Jim has NOT yet approved the counting rule, so the rule below is Quinn's REC and the flag is OFF:
//   can_do  = scoreable move that is GREEN (every needed joint GREEN)
//   almost  = scoreable move that is YELLOW (shown separately, not counted in pct in the default mode)
//   scored  = moves that are fully scoreable: a rule exists AND every needed joint is measured (no GREY joint)
//   total   = every move in the sport's catalog
//   not_rated = total - scored, split into no_rule (permanent "not rated") and needs_test (a needed joint is unmeasured
//               or its requirement has no centimeter number yet)
//   pct     = can_do / scored (rounded), null when scored is 0
// PENDING JIM: PACK_PERCENT_MODE. "green_only" = Quinn's REC. "yellow_half" = Grant's alternative (YELLOW counts as half).
// In both modes GREY moves stay OUT of the denominator.
import type { Status, GreyReason, JointStatus } from "./rule.ts";

export const PACK_PERCENT_MODE: "green_only" | "yellow_half" = "green_only"; // PENDING JIM

export type MoveForRating = { tier: Status; grey_reason: GreyReason | null; joint_status: JointStatus[] };

export type PackRating = {
  pct: number | null;
  can_do: number;
  almost: number;
  scored: number;
  total: number;
  not_rated: number;
  no_rule: number;
  needs_test: number;
  mode: "green_only" | "yellow_half";
  scored_text: string;      // "scored 40 of 120 moves"
  not_rated_text: string;   // "80 need a test or have no rule yet"
};

export function packRating(moves: MoveForRating[], mode: "green_only" | "yellow_half" = PACK_PERCENT_MODE): PackRating {
  let can_do = 0, almost = 0, scored = 0, no_rule = 0, needs_test = 0;
  for (const m of moves) {
    const hasRule = m.joint_status.length > 0;
    const allMeasured = hasRule && m.joint_status.every(j => j.status !== "GREY");
    if (!hasRule || m.grey_reason === "no_rule") { no_rule++; continue; }
    if (!allMeasured) { needs_test++; continue; }
    scored++;
    if (m.tier === "GREEN") can_do++;
    else if (m.tier === "YELLOW") almost++;
  }
  const total = moves.length;
  const num = mode === "yellow_half" ? can_do + 0.5 * almost : can_do;
  return {
    pct: scored > 0 ? Math.round((num / scored) * 100) : null,
    can_do, almost, scored, total,
    not_rated: total - scored, no_rule, needs_test, mode,
    scored_text: `scored ${scored} of ${total} moves`,
    not_rated_text: `${total - scored} need a test or have no rule yet`,
  };
}

// Flag gate. Returns null when the flag is off, so callers can spread it into a response without changing today's shape.
export function packRatingIfEnabled(enabled: boolean, moves: MoveForRating[]): PackRating | null {
  return enabled ? packRating(moves) : null;
}
