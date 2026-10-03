// Base per-joint grading tables (pure, no Deno/Supabase imports so they can be unit tested in node).
// DRAFT, not deployed. Base only: the sport apps never assess; they apply these Base results to moves.
//
// Jim's rules applied here:
//   - GREEN / YELLOW / RED per joint (here: per leg), unmeasured or not gradable = GREY, never GREEN
//   - no blended score color; left and right are graded separately and the gap is FLAGGED, not averaged
//   - ELITE is not defined here and nothing in this file can produce it (GREEN means "at or above the
//     reference edge", not elite)
//
// Hip flexion (Base keeps the STRAIGHT-LEG raise; Jim closed this on 2026-10-03).
//   Source: Youdas JW, Krause DA, Hollman JH, Harmsen WS, Laskowski E. J Orthop Sports Phys Ther 2005;35(4):246-252,
//   PMID 15901126, DOI 10.2519/jospt.2005.35.4.246. n=214 healthy adults (106 men, 108 women), age 20-79,
//   passive SLR as trunk-thigh angle (goniometer). Sex difference 8 degrees (P<.001), no age effect.
//   Means and SDs below are as relayed in Quinn's file /workspace/quinn-research/grok-heavy-slr-norms-20261003.md.
//   The public abstract confirms sample, method, the 8 degree sex difference and no age effect; it does NOT print the
//   means or SDs, so they are UNVERIFIED against the full text (see hip-flexion-norms-drafts.md).
//   Cut rule (Quinn REASONING, not a published cut-off): GREEN at or above mean - 1 SD, YELLOW from mean - 2 SD up
//   to mean - 1 SD, RED below mean - 2 SD. Youdas published no percentiles.

export type Status = "GREEN" | "YELLOW" | "RED" | "GREY";
export type Sex = "male" | "female" | "unknown";
export type NormSource = "PUBLISHED_MEAN_SD" | "REASONING" | "PROPOSED" | "EXISTING_BASE_CONFIG";

// ---------------------------------------------------------------------------------------------------------------
// Hip flexion, straight-leg raise, degrees, graded PER LEG, SEX-SPECIFIC
// ---------------------------------------------------------------------------------------------------------------
export type HipFlexNormRow = {
  sex: "male" | "female";
  mean: number;
  sd: number;
  green_min: number;  // mean - 1 SD
  yellow_min: number; // mean - 2 SD
  source: string;
};

export const HIP_FLEX_SLR_NORMS: Record<"male" | "female", HipFlexNormRow> = {
  male: {
    sex: "male", mean: 68.5, sd: 6.8, green_min: 61.7, yellow_min: 54.9,
    source: "Youdas 2005 JOSPT 35(4):246-252 PMID 15901126, men n=106, mean 68.5 +/- 6.8 (avg of sides); cut = mean-1SD / mean-2SD (Quinn REASONING)",
  },
  female: {
    sex: "female", mean: 76.3, sd: 9.5, green_min: 66.8, yellow_min: 57.3,
    source: "Youdas 2005 JOSPT 35(4):246-252 PMID 15901126, women n=108, mean 76.3 +/- 9.5 (avg of sides); cut = mean-1SD / mean-2SD (Quinn REASONING)",
  },
};

// Age bands from Youdas (mean, SD, n). Quinn: ANOVA found no age effect from 20 to 79, so ONE adult cut-off per sex is
// used and these are kept as reference only. The 70-79 cells are a little lower and small (10 men, 14 women).
export const HIP_FLEX_SLR_AGE_BANDS_REFERENCE_ONLY = {
  male: [
    ["20-29", 20, 69.4, 4.7], ["30-39", 20, 68.7, 5.4], ["40-49", 19, 67.8, 8.6],
    ["50-59", 16, 66.6, 7.0], ["60-69", 21, 71.0, 6.4], ["70-79", 10, 65.4, 8.9],
  ],
  female: [
    ["20-29", 23, 78.2, 11.6], ["30-39", 15, 76.5, 8.9], ["40-49", 20, 76.4, 8.1],
    ["50-59", 17, 76.6, 8.8], ["60-69", 19, 75.2, 9.9], ["70-79", 14, 73.8, 9.7],
  ],
} as const;
export const HIP_FLEX_USE_AGE_BANDS = false; // Quinn: optional, not required

// Quinn suggests widening YELLOW by about 5 degrees past each edge so one noisy self-test reading does not flip
// GREEN to RED. REASONING, off by default (0). PENDING JIM / Quinn. If set to 5: GREEN edge rises and RED edge falls by 5.
export const HIP_FLEX_YELLOW_WIDEN_DEG = 0;

// Left/right gap flag. 10 degrees is Quinn's REASONING figure (file: "a gap larger than about 10 degrees, labelled
// asymmetry, not used as the grade"). Nearest published support is Boyd and Villa, BMC Musculoskelet Disord 2012;13:245
// (inter-limb gaps under 10.9 / 9.4 degrees in 90% of healthy people) but that is a symptom-onset neurodynamic test,
// not hamstring end range. So this is NOT a published hamstring cut-off.
export const HIP_FLEX_ASYMMETRY_FLAG_DEG = 10;
export const HIP_FLEX_ASYMMETRY_SOURCE: NormSource = "REASONING";

// PENDING JIM: how to treat straight-leg readings over 90 degrees. A straight-knee raise rarely exceeds about 90
// (Elson 2008: range 30-90 before the pelvis rotates; 50 to 90+ if spine flexion is counted), so a bigger number may
// mean the pelvis or low back helped, or the knee bent. Jim has a follow-up on this and has NOT decided.
//   "grade_normally" = grade exactly like any other number (current behavior, so a high number is GREEN)
//   "grey"           = do not grade, show GREY (reason above_review_limit)
// Change ONLY this constant (and the limit) once Jim decides. The flag above_review_limit is always reported.
export const HIP_FLEX_REVIEW_ABOVE_DEG = 90;
export const HIP_FLEX_ABOVE_REVIEW_HANDLING: "grade_normally" | "grey" = "grade_normally"; // PENDING JIM

// users.gender values written by Base CompleteProfile: male, female, other, prefer_not_to_say, or null (optional).
// Anything that is not clearly male or female is "unknown".
// Missing/unknown sex fallback (stated plainly): the leg is GREY with reason sex_missing. We do NOT guess an edge,
// because the male and female edges differ by about 2 to 5 degrees at the edges and a guess could print
// GREEN for a reading that is YELLOW on the correct table. The raw value, the asymmetry flag and the
// above-limit flag are still reported (they do not need sex).
export function normalizeSex(raw: unknown): Sex {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "male" || s === "m" || s === "man") return "male";
  if (s === "female" || s === "f" || s === "woman") return "female";
  return "unknown";
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
}

export type LegGrade = {
  status: Status;
  reason: "sex_missing" | "not_measured" | "above_review_limit" | null;
  above_review_limit: boolean;
};

export function hipFlexEdges(sex: "male" | "female"): { green_min: number; yellow_min: number } {
  const r = HIP_FLEX_SLR_NORMS[sex];
  return { green_min: r.green_min + HIP_FLEX_YELLOW_WIDEN_DEG, yellow_min: r.yellow_min - HIP_FLEX_YELLOW_WIDEN_DEG };
}

export function gradeHipFlexLeg(sexRaw: unknown, value: unknown): LegGrade {
  const v = num(value);
  if (v == null) return { status: "GREY", reason: "not_measured", above_review_limit: false };
  const above = v > HIP_FLEX_REVIEW_ABOVE_DEG;
  const sex = normalizeSex(sexRaw);
  if (sex === "unknown") return { status: "GREY", reason: "sex_missing", above_review_limit: above };
  if (above && HIP_FLEX_ABOVE_REVIEW_HANDLING === "grey") {
    return { status: "GREY", reason: "above_review_limit", above_review_limit: true };
  }
  const e = hipFlexEdges(sex);
  const status: Status = v >= e.green_min ? "GREEN" : v >= e.yellow_min ? "YELLOW" : "RED";
  return { status, reason: null, above_review_limit: above };
}

export type Asymmetry = {
  flag: boolean | null;     // null = cannot tell (one or both legs not measured)
  diff_deg: number | null;
  threshold_deg: number;
  threshold_source: NormSource;
};

export function hipFlexAsymmetry(left: unknown, right: unknown): Asymmetry {
  const l = num(left), r = num(right);
  const base = { threshold_deg: HIP_FLEX_ASYMMETRY_FLAG_DEG, threshold_source: HIP_FLEX_ASYMMETRY_SOURCE };
  if (l == null || r == null) return { flag: null, diff_deg: null, ...base };
  const diff = Math.round(Math.abs(l - r) * 10) / 10;
  return { flag: diff > HIP_FLEX_ASYMMETRY_FLAG_DEG, diff_deg: diff, ...base };
}

const RANK: Record<Status, number> = { GREEN: 0, YELLOW: 1, RED: 2, GREY: -1 };
// Joint color = worst MEASURED leg (RED > YELLOW > GREEN). GREY only when no leg could be graded. If one leg is
// graded and the other is not measured, the graded leg decides and partial=true is reported.
export function worstOf(statuses: Status[]): Status {
  const graded = statuses.filter(s => s !== "GREY");
  if (!graded.length) return "GREY";
  return graded.reduce((w, s) => (RANK[s] > RANK[w] ? s : w), graded[0]);
}

export type HipFlexGrade = {
  joint: "hip_flex";
  test: "straight_leg_raise";
  status: Status;           // worst graded leg; not a blend
  partial: boolean;         // true when only one leg was measured
  left: LegGrade;
  right: LegGrade;
  asymmetry: Asymmetry;
  above_review_limit_handling: "grade_normally" | "grey"; // PENDING JIM
};

export function gradeHipFlexion(sexRaw: unknown, left: unknown, right: unknown): HipFlexGrade {
  const l = gradeHipFlexLeg(sexRaw, left);
  const r = gradeHipFlexLeg(sexRaw, right);
  const measured = [num(left), num(right)].filter(x => x != null).length;
  return {
    joint: "hip_flex",
    test: "straight_leg_raise",
    status: worstOf([l.status, r.status]),
    partial: measured === 1,
    left: l,
    right: r,
    asymmetry: hipFlexAsymmetry(left, right),
    above_review_limit_handling: HIP_FLEX_ABOVE_REVIEW_HANDLING,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ankle dorsiflexion: ONE test, knee-to-wall, CENTIMETERS, Base only (Jim closed this on 2026-10-03).
// ---------------------------------------------------------------------------------------------------------------
// There is no published cm cut-off (Quinn files: Bennell 1998 shows the cm test is reliable, ICC 0.97-0.99, and
// healthy adults land around 9 to 12 cm; McBride 2026 PMID 41723909 abstract gives no cm numbers; the matrix numbers
// 10/15/20 are degrees-authored and are NOT converted). So:
//   GREEN edge  10 cm  = Base's own existing step config (assessmentSteps2.ts normalLow 10, riskBelow 10)   [EXISTING_BASE_CONFIG]
//   YELLOW band 1.6 cm below the green edge = Powden 2015 inter-clinician MDC for tape knee-to-wall, used here only as a
//               noise allowance. NOT a clinical cut-off.                                                  [PROPOSED, for Quinn/Jim]
//   RED         below the yellow band.
export const ANKLE_DF_CM_GREEN_MIN = 10;          // EXISTING_BASE_CONFIG
export const ANKLE_DF_CM_YELLOW_WIDTH = 1.6;      // PROPOSED (Quinn/Jim to confirm)
export const ANKLE_DF_CM_YELLOW_SOURCE: NormSource = "PROPOSED";
// One number used wherever the engine needs an ankle "target" in cm for percent-of-target math (rom_total, worst_joints).
// It replaces the old literal 20, which was a target written for a degree-style scale and applied to cm (F-17).
export const ANKLE_DF_CM_TARGET = ANKLE_DF_CM_GREEN_MIN; // PROPOSED; mirrors elsewhere must change together (see PR)

export type AnkleLegGrade = { status: Status; reason: "not_measured" | null };

export function gradeAnkleCmLeg(value: unknown): AnkleLegGrade {
  const v = num(value);
  if (v == null) return { status: "GREY", reason: "not_measured" };
  if (v >= ANKLE_DF_CM_GREEN_MIN) return { status: "GREEN", reason: null };
  if (v >= ANKLE_DF_CM_GREEN_MIN - ANKLE_DF_CM_YELLOW_WIDTH) return { status: "YELLOW", reason: null };
  return { status: "RED", reason: null };
}

export type AnkleGrade = {
  joint: "ankle_df";
  test: "knee_to_wall";
  unit: "cm";
  status: Status;
  partial: boolean;
  left: AnkleLegGrade;
  right: AnkleLegGrade;
};

export function gradeAnkleDf(left: unknown, right: unknown): AnkleGrade {
  const l = gradeAnkleCmLeg(left), r = gradeAnkleCmLeg(right);
  const measured = [num(left), num(right)].filter(x => x != null).length;
  return { joint: "ankle_df", test: "knee_to_wall", unit: "cm", status: worstOf([l.status, r.status]), partial: measured === 1, left: l, right: r };
}

// Used by index.ts. Never throws.
export function gradeBaseJoints(sexRaw: unknown, a: Record<string, unknown>) {
  return {
    hip_flex: gradeHipFlexion(sexRaw, a.hip_flex_l, a.hip_flex_r),
    ankle_df: gradeAnkleDf(a.ankle_df_l, a.ankle_df_r),
  };
}
