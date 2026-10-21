// T1 narrow-joint bands: ONE per-joint config for compute-tiers and the lead email (pure, no Deno/Supabase imports).
// Jim, Oct 21 2026: 10:53 AM ET "T1: A plus C"; 11:47 AM ET narrow the buffer on hip ER/IR/abduction and neck
// flexion/side bend so Building survives and a buffered Steady never shows 100%. Values: Quinn t1-quinn-buffers.md (11:47:58 AM ET).
// A: steady = buffer at the Steady line, building = buffer at the Building line. A reading inside a buffer gets the better color.
//    Steady if worse + steady >= target, Building if worse + building >= 0.9 x target, else Needs focus. Stored values never change.
// C: Protocol gap weight 0.5 on narrow joints until this and the previous assessment show the same band, then 1.
// Mirrors romrx-io-web mobilityBands.ts NARROW_BAND_CONFIG and SQL public.t1_narrow_buffer(joint, line).
// No user step, no copy, never a retest hint (ledger L655).
export const NARROW_BAND_CONFIG: Readonly<Record<string, { steady: number; building: number }>> = {
  hip_er: { steady: 1.5, building: 0 },
  hip_ir: { steady: 1.5, building: 0 },
  hip_abd: { steady: 2, building: 0 },
  cervical_flex: { steady: 2.5, building: 0 },
  cervical_lat: { steady: 2, building: 0 },
  cervical_rot: { steady: 5, building: 5 },
  cervical_ext: { steady: 5, building: 5 },
  shoulder_er: { steady: 5, building: 5 },
  ankle_df: { steady: 1, building: 1 },
};
export const NARROW_GAP_WEIGHT = 0.5;

const NONE = { steady: 0, building: 0 };
export function narrowBuffers(key: string): { steady: number; building: number } {
  return NARROW_BAND_CONFIG[key.replace(/_(l|r)$/, "")] ?? NONE;
}
export function isNarrowJoint(key: string): boolean {
  const b = narrowBuffers(key);
  return b.steady > 0 || b.building > 0;
}

const fx = (n: number) => Math.round(n * 1e6);

/** Base band 1 | 2 | 3 for one value. Non-narrow joints keep the old ratio rule exactly. */
export function bandForJoint(key: string, worse: number, target: number): 1 | 2 | 3 {
  if (!(target > 0) || !Number.isFinite(worse)) return 1;
  if (!isNarrowJoint(key)) {
    const r = worse / target;
    return r >= 1.0 ? 3 : r >= 0.9 ? 2 : 1;
  }
  const b = narrowBuffers(key);
  if (fx(worse + b.steady) >= fx(target)) return 3;
  if (fx(worse + b.building) * 10 >= fx(target) * 9) return 2;
  return 1;
}

/** Option C weighted gap: 0 when Steady, else (1 - min(1, worse/target)) x weight. */
export function weightedGap(key: string, worse: number, target: number, prevWorse?: number | null): number {
  const band = bandForJoint(key, worse, target);
  if (band === 3) return 0;
  const gap = 1 - Math.min(1, Math.max(0, worse / target));
  if (!isNarrowJoint(key)) return gap;
  const prevBand = prevWorse == null || !Number.isFinite(prevWorse) ? null : bandForJoint(key, prevWorse, target);
  return gap * (prevBand != null && prevBand === band ? 1 : NARROW_GAP_WEIGHT);
}

/** Same as the app's clampPercentToBand(). */
export function clampPercentToBand(pct: number, band: 1 | 2 | 3): number {
  if (band === 3) return 100;
  if (band === 2) return Math.max(90, Math.min(pct, 99));
  return Math.max(0, Math.min(pct, 89));
}

/** Same as the app's displayPercent(): narrow joints show the real floor %; a buffered Steady /100 shows the real number. */
export function displayPercent(rawFloor: number, band: 1 | 2 | 3, narrow = false): number {
  if (narrow) return Math.max(0, Math.min(100, rawFloor));
  if (band === 3 && rawFloor < 100) return Math.max(0, rawFloor);
  return clampPercentToBand(rawFloor, band);
}
