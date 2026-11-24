// BASE-IMMEDIATE-CHARGE-20261124 (BUILD ONLY, not deployed): which Base checkout path applies at a given instant.
//
//   "paid"   !inFreePeriod(now), i.e. now >= BASE_PAID_CUTOVER_UNIX (Wed Dec 30, 2026 12:00:00 PM ET). Base only,
//            $60/yr charged at checkout, no trial_end, Stacy's P1/P3 copy, never a pack. This is the SAME condition
//            that flips every free-period wording switch, so words and charge cannot disagree.
//   "trial"  before that and now <= BASE_TRIAL_CLOSE_UNIX: unchanged v50 path (trial_end 1798822800, Jan 1 charge).
//   "closed" only if BASE_PAID_CUTOVER_UNIX is ever moved later than BASE_TRIAL_CLOSE_UNIX: the v50 503 for the gap
//            (Stripe needs trial_end >= 48 h out). With today's constant this window is empty.
import { BASE_PAID_CUTOVER_UNIX, BETA_TRIAL_END_UNIX, inFreePeriod } from "../_shared/arl_copy.ts";

export { BASE_PAID_CUTOVER_UNIX };
/** v50 fail-closed instant: 48 h before the fixed trial_end (Stripe minimum). Wed Dec 30, 2026 12:00:00 PM ET. */
export const BASE_TRIAL_CLOSE_UNIX = BETA_TRIAL_END_UNIX - 48 * 3600;

/** Promotion codes on the PAID path only (trial path unchanged: always true, as live). Jim decides; one line.
 *  Stacy note 1.4.2: if true, a discounted buyer sees P1/P5 at the full price; false avoids that. Default = live (true). */
export const BASE_PAID_ALLOW_PROMOTION_CODES = true;

export type BasePhase = "trial" | "closed" | "paid";

export function baseCheckoutPhase(nowMs: number): BasePhase {
  if (!inFreePeriod(nowMs)) return "paid";
  if (nowMs > BASE_TRIAL_CLOSE_UNIX * 1000) return "closed"; // v50: Date.now() > (BETA_TRIAL_END_UNIX - 48 * 3600) * 1000
  return "trial";
}

/** subscription_data for a Base-only session. Paid omits trial_end; otherwise the given (v50 / pack-fix) trial_end. */
export function baseSubscriptionData(phase: BasePhase, meta: Record<string, string>, trialEndUnix: number | null):
  { metadata: Record<string, string>; trial_end?: number } {
  if (phase === "paid" || trialEndUnix == null) return { metadata: meta };
  return { metadata: meta, trial_end: trialEndUnix };
}
