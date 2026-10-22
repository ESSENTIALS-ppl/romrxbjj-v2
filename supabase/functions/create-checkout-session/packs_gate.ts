// Sport pack checkout kill switch (Jim, Oct 6 2026 12:32 PM ET: no new sport pack purchases until packs release in
// January 2027; existing holders keep access). Pure module: no imports, so it is unit-testable without Stripe/Supabase.
//
// Default is CLOSED. Packs reopen only when the env secret PACKS_CHECKOUT_OPEN is exactly "true" (case-insensitive).
// January reopen = `supabase secrets set PACKS_CHECKOUT_OPEN=true` (no code change, no redeploy).
//
// Scope: only NEW checkout sessions in create-checkout-session. stripe-webhook, create-portal-session, renewals and
// sport_entitlements are untouched, so existing subscriptions and access are unaffected.
export const PACKS_CLOSED_MESSAGE = "Sport packs open in January 2027.";
export const PACKS_CLOSED_CODE = "packs_closed";
export const PACKS_CLOSED_STATUS = 403;

export function packsCheckoutOpen(raw: string | undefined | null): boolean {
  return String(raw ?? "").trim().toLowerCase() === "true";
}

// Values that mean "no sport" on a Base request (Base events log sport "general").
const BASE_MARKERS = new Set(["", "base", "general"]);
function namesASport(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  return !BASE_MARKERS.has(String(v).trim().toLowerCase());
}

export type GateBody = { pending_sport?: unknown; add?: unknown; sport?: unknown; price_id?: unknown; lead_token?: unknown };

/**
 * Returns why this request is a sport pack checkout (null = not a pack request).
 * - mode "unlock" is always a pack (it only exists to add a sport to Base).
 * - mode "base" is a pack request when it names any sport (pending_sport / add / sport) other than Base,
 *   or carries any price_id other than the Base price. Plain Base requests return null and are untouched.
 * - Other modes (coach has its own COACH_CHECKOUT_OPEN pause; no mode = 400 "Invalid mode") are not gated here.
 */
export function packRequestReason(mode: string | undefined, body: GateBody, basePriceId: string): string | null {
  if (mode === "unlock") return "unlock";
  if (mode !== "base") return null;
  if (namesASport(body.pending_sport)) return "pending_sport";
  if (namesASport(body.add)) return "add";
  if (namesASport(body.sport)) return "sport";
  if (body.price_id !== undefined && body.price_id !== null && String(body.price_id).trim() !== "" &&
      String(body.price_id).trim() !== basePriceId) return "price_id";
  return null;
}

function hasLeadToken(body: GateBody): boolean {
  return typeof body.lead_token === "string" && body.lead_token.trim() !== "";
}

export type GateDecision =
  | { action: "pass" }
  | { action: "block"; reason: string }
  | { action: "drop_sport"; reason: string };

/**
 * What to do with a request while packs are closed.
 * - Pack requests are blocked (403 packs_closed): unlock, Base + sport combo without a lead token, any non-Base price_id.
 * - Lead-email unlock (mode "base" WITH a lead_token) that names a sport: the sport is dropped and the request continues
 *   as Base-only (Jim: Base checkout must keep working). The lead token itself is still validated by claimLead in
 *   index.ts (invalid -> 404 lead_not_found, no session). A non-Base price_id is blocked even with a lead token.
 * - Everything else passes unchanged.
 */
export function packGateDecision(mode: string | undefined, body: GateBody, basePriceId: string): GateDecision {
  const reason = packRequestReason(mode, body, basePriceId);
  if (!reason) return { action: "pass" };
  if (mode === "base" && reason !== "price_id" && hasLeadToken(body) &&
      packRequestReason(mode, { price_id: body.price_id }, basePriceId) === null) {
    return { action: "drop_sport", reason };
  }
  return { action: "block", reason };
}

/** Removes every sport-naming field so the Base path sees a plain Base request (no pack line item or metadata). */
export function dropSportFields(body: GateBody): void {
  delete body.pending_sport;
  delete body.add;
  delete body.sport;
}

export function packsClosedBody() {
  return { error: PACKS_CLOSED_MESSAGE, message: PACKS_CLOSED_MESSAGE, code: PACKS_CLOSED_CODE };
}
