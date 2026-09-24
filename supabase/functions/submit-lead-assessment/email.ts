// Base lead results email (pure render, no Deno/network). submit-lead-assessment v18, 2026-09-24.
// v18 (Fix A, Jim LOCK via Grant 2026-09-24 5:32 PM ET): the /100 and per-joint % use the ONE Base
//      formula shared with the app. MUST STAY IN SYNC with romrx-io-web app/src/lib/mobilityBands.ts
//      (jointPercent / mobilityScoreForAssessment / clampPercentToBand). Port any change there here.
//        per-joint %  = floor(100 * min(1, worse / target)), clamped into the joint's band
//        /100         = floor(mean of min(1, worse/target) * 100 over measured joints), clamped into
//                       the overall band: Needs focus min(s, 89); Building max(90, min(s, 99)); Steady 100.
// v17: Needs focus variant no longer repeats "top three problem areas" in back-to-back paragraphs.
// Base bands only: Needs focus / Building / Steady (Jim LOCK via Grant 2026-09-24).
// Band logic mirrors romrx-io-web app/src/lib/mobilityBands.ts overallBandForAssessment()
// and public.compute_joint_scores(): per joint worse side / target, >= 1.00 Steady,
// >= 0.90 Building, else Needs focus; overall = worst joint. This function is Base-only
// (sport = general); sport-pack emails live elsewhere and keep their own labels.

export type BaseBand = "Needs focus" | "Building" | "Steady";
type JointMap = Record<string, number | null | undefined>;

/** Same joints + targets as mobilityBands.ts ASSESSMENT_JOINTS / JOINT_SCORE_TARGETS. */
const BAND_JOINTS: ReadonlyArray<{ key: string; target: number; l?: string; r?: string; single?: string }> = [
  { target: 45, key: "hip_er", l: "hip_er_l", r: "hip_er_r" },
  { target: 45, key: "hip_ir", l: "hip_ir_l", r: "hip_ir_r" },
  { target: 90, key: "hip_abd", l: "hip_abd_l", r: "hip_abd_r" },
  { target: 120, key: "hip_flex", l: "hip_flex_l", r: "hip_flex_r" },
  { target: 90, key: "shoulder_er", l: "shoulder_er_l", r: "shoulder_er_r" },
  { target: 180, key: "shoulder_flex", l: "shoulder_flex_l", r: "shoulder_flex_r" },
  { target: 20, key: "ankle_df", l: "ankle_df_l", r: "ankle_df_r" },
  { target: 80, key: "cervical_rot", l: "cervical_rot_l", r: "cervical_rot_r" },
  { target: 45, key: "cervical_lat", l: "cervical_lat_l", r: "cervical_lat_r" },
  { target: 60, key: "lumbar_flex", single: "lumbar_flex" },
  { target: 25, key: "lumbar_ext", single: "lumbar_ext" },
  { target: 50, key: "cervical_flex", single: "cervical_flex" },
  { target: 60, key: "cervical_ext", single: "cervical_ext" },
];

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Worse side: midline, else lower of L/R, else the one side (same as the app's worseSideValue). */
function worseOf(data: JointMap, j: { l?: string; r?: string; single?: string }): number | null {
  if (j.single) return num(data[j.single]);
  const l = num(data[j.l!]), r = num(data[j.r!]);
  return l != null && r != null ? Math.min(l, r) : (l ?? r);
}

/** compute_joint_scores() band for one ratio: >= 1.00 Steady, >= 0.90 Building, else Needs focus. */
function bandFromRatio(worse: number, target: number): 1 | 2 | 3 {
  const ratio = worse / target;
  return ratio >= 1.0 ? 3 : ratio >= 0.9 ? 2 : 1;
}

/** Same as the app's clampPercentToBand(). */
export function clampPercentToBand(pct: number, band: 1 | 2 | 3): number {
  if (band === 3) return 100;
  if (band === 2) return Math.max(90, Math.min(pct, 99));
  return Math.max(0, Math.min(pct, 89));
}

/** 1 Needs focus, 2 Building, 3 Steady; null when no banded joint is measured. */
export function overallBandScore(data: JointMap): 1 | 2 | 3 | null {
  let worst: 1 | 2 | 3 | null = null;
  for (const j of BAND_JOINTS) {
    const worse = worseOf(data, j);
    if (worse == null) continue;
    const band = bandFromRatio(worse, j.target);
    if (worst == null || band < worst) worst = band;
  }
  return worst;
}

/** Per-joint % (same as the app's jointPercent()), keyed by joint (hip_er, lumbar_ext, ...). */
export function jointPercents(data: JointMap): Record<string, { pct: number; band: 1 | 2 | 3 }> {
  const out: Record<string, { pct: number; band: 1 | 2 | 3 }> = {};
  for (const j of BAND_JOINTS) {
    const worse = worseOf(data, j);
    if (worse == null) continue;
    const band = bandFromRatio(worse, j.target);
    const raw = Math.min(1, Math.max(0, worse / j.target)) * 100;
    out[j.key] = { pct: clampPercentToBand(Math.floor(raw), band), band };
  }
  return out;
}

/**
 * THE /100 (same as the app's mobilityScoreForAssessment()). Same joints, same order, same
 * arithmetic, so the float result is bit-identical. null when no banded joint is measured.
 */
export function mobilityScore(data: JointMap): number | null {
  let sum = 0;
  let n = 0;
  for (const j of BAND_JOINTS) {
    const worse = worseOf(data, j);
    if (worse == null) continue;
    sum += Math.min(1, Math.max(0, worse / j.target)) * 100;
    n += 1;
  }
  if (n === 0) return null;
  const band = overallBandScore(data) ?? 3;
  return clampPercentToBand(Math.floor(sum / n), band);
}

export const BAND_LABEL: Record<1 | 2 | 3, BaseBand> = { 1: "Needs focus", 2: "Building", 3: "Steady" };

const BAND_COPY: Record<1 | 2 | 3, { color: string; intro: string }> = {
  1: { color: "#B91C1C",
    intro: "Your top three problem areas need work. Small daily progress moves you up. Continue to your dashboard for your individualized plan and start today." },
  2: { color: "#A16207",
    intro: "Progress needed on key joints. Continue to your dashboard for your individualized plan and stay consistent with it." },
  3: { color: "#1D4ED8",
    intro: "Solid mobility foundation. Continue to your dashboard to keep training, protect what you have, and retest regularly." },
};

/** Exactly "NN/100 · Band" (U+00B7 middle dot), same as the app's formatScoreBand(). */
export function formatScoreBand(score: number, band: 1 | 2 | 3 | null): string {
  return band == null ? `${score}/100` : `${score}/100 \u00B7 ${BAND_LABEL[band]}`;
}

export function renderSubject(score: number, band: 1 | 2 | 3 | null): string {
  return `Your ROM score: ${formatScoreBand(score, band)}`;
}

const SRT_CITATION = `Araujo CGS et al. "Sitting-rising test scores predict natural and cardiovascular causes of deaths." European Journal of Preventive Cardiology, June 2025. DOI: 10.1093/eurjpc/zwaf325`;
const SRT_URL = "https://academic.oup.com/eurjpc/advance-article/doi/10.1093/eurjpc/zwaf325/8163161";

export function renderEmail(
  score: number,
  band: 1 | 2 | 3 | null,
  unlockToken: string,
  email: string,
  publicOrigin: string,
): string {
  const c = BAND_COPY[band ?? 3];
  const color = band == null ? "#1D4ED8" : c.color;
  const intro = band == null ? "Continue to your dashboard for your individualized plan." : c.intro;
  const pill = band == null
    ? ""
    : `<div style="margin-top:12px;display:inline-block;padding:6px 14px;border-radius:999px;background:${color}1A;color:${color};font-size:13px;font-weight:700;letter-spacing:0.02em;">${BAND_LABEL[band]}</div>`;
  const unlockUrl = `${publicOrigin}/app/unlock/${unlockToken}`;
  // Needs focus intro already names the top three problem areas; avoid repeating it in the next paragraph.
  const unlockWhat = band === 1
    ? "your joints, which ones to work on first, and your next step"
    : "your joints, your top three problem areas, and your next step";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter Tight',-apple-system,sans-serif;color:#0F172A;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:28px;font-weight:800;color:#1D4ED8;letter-spacing:-0.02em;">ROMRx</div>
    <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Personalized Readiness Profile</div>
  </div>
  <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #E2E8F0;">
    <div style="text-align:center;">
      <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Your ROM Score</div>
      <div style="font-size:48px;font-weight:800;color:${color};line-height:1;">${score}<span style="font-size:16px;font-weight:700;">/100</span></div>
      ${pill}
    </div>
    <p style="margin:24px 0 0 0;line-height:1.6;color:#334155;font-size:15px;">Hey there,</p>
    <p style="margin:16px 0 0 0;line-height:1.6;color:#334155;font-size:15px;">Your ROM score is ${formatScoreBand(score, band)}.</p>
    <p style="margin:16px 0 0 0;line-height:1.6;color:#334155;font-size:15px;">${intro}</p>
    <p style="margin:16px 0 0 0;line-height:1.6;color:#334155;font-size:15px;">This is the start of your Personalized Readiness Profile for longevity, self-care, and mobility. Unlock your dashboard to see ${unlockWhat}.</p>
    <div style="margin:28px 0;text-align:center;">
      <a href="${unlockUrl}" style="display:inline-block;padding:14px 28px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Unlock My Dashboard</a>
      <div style="font-size:11px;color:#64748B;margin-top:10px;">ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.</div>
    </div>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
    <div style="font-size:12px;color:#64748B;line-height:1.6;">
      <strong style="color:#0F172A;">Why this matters:</strong>
      Peer-reviewed research links functional mobility to long-term health outcomes. Recent work from the European Journal of Preventive Cardiology shows that low sit-rise scores predict natural and cardiovascular mortality independent of other risk factors. Your ROM profile is a modifiable proxy for that risk.
      <br><br>
      <a href="${SRT_URL}" style="color:#1D4ED8;">${SRT_CITATION}</a>
    </div>
  </div>
  <p style="text-align:center;color:#94A3B8;font-size:11px;margin-top:24px;">You received this because you completed a ROMRx assessment. <a href="${publicOrigin}/app/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94A3B8;">Unsubscribe</a>.</p>
</div></body></html>`;
}
