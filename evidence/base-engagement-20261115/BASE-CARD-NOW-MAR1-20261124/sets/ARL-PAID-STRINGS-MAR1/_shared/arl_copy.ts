// _shared/arl_copy.ts - California auto-renewal (ARL) customer copy, Legal (Stacy) plan
// /workspace/stacy-research/ca-arl-plan-20260929.md sections 3b and 3c. Jim approved via Grant 2026-09-29.
// Customer-facing text below is Stacy's EXACT wording. Only the {placeholders} are filled in:
//   prices come from the live Stripe Price objects at runtime (never hardcoded), sport pack names
//   match the app labels. Do not edit wording here without a new Legal version string.
// No em dashes. American spelling ("canceling"), per Legal update 2026-09-29 (sections 3b-2 / 3c-2 added).
// v3: Jim decision (c) 2026-09-29, cancel ends access immediately, no refunds; Legal copy "Canceling ends your access
// right away." (3b) and the "When you cancel:" bullet (3c / 3c-2).

export const ARL_DISCLOSURE_VERSION = "ca-arl-3b-2027-03-01-v5";
export const ARL_ACK_VERSION = "ca-arl-3c-2027-03-01-v5";

/** Beta free period ends at this instant (2027-01-01 12:00 ET); same value as subscription_data.trial_end. */
export const BETA_TRIAL_END_UNIX = 1803920400;
export function inFreePeriod(nowMs: number = Date.now()): boolean {
  return nowMs < BETA_TRIAL_END_UNIX * 1000;
}

export const SPORT_PACK_NAMES: Record<string, string> = {
  bjj: "ROMRx+BJJ",
  bodybuilding: "ROMRx+BodyBuilding",
};

export const SUPPORT_EMAIL = "hello@romrx.io";
export const CANCEL_LINK = "https://romrx.io/app/dashboard/settings";
export const LEGAL_URL = "https://romrx.io/legal";

// 3b consent line (the "[ ]" in the plan is the checkbox itself, rendered by Stripe).
export const ARL_CONSENT_TEXT = "I agree that my plan renews automatically at the price shown until I cancel.";

/** $60 / $149 style. Whole-dollar amounts drop the cents; otherwise two decimals. USD only. */
export function formatUsd(unitAmountCents: number): string {
  const dollars = unitAmountCents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** 3b, Base only. */
export function disclosureBase(basePrice: string): string {
  return `ROMRx Base is free until March 1, 2027, our beta launch trial period. Then ${basePrice} per year, charged to your card on March 1, 2027 and on March 1 every year after until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Cancel before March 1, 2027 and you pay nothing. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before your first charge and before each yearly renewal.`;
}

/** 3b, Base plus sport pack. */
export function disclosureCombo(basePrice: string, sportPrice: string, sportPack: string): string {
  return `Free through December 31, 2026. Then ${basePrice} per year for Base plus ${sportPrice} per year for ${sportPack}, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Canceling ends your access right away. Cancel before January 1, 2027 and you pay nothing.`;
}

/** 3b-2, sport-only (existing Base user adds a pack), while the free period runs. */
export function disclosureSport(sportPrice: string, sportPack: string): string {
  return `Free through December 31, 2026. Then ${sportPrice} per year for ${sportPack}, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Canceling ends your access right away. Cancel before January 1, 2027 and you pay nothing.`;
}

/** 3b-2, sport-only, from January 1, 2027 on (no free wording). */
export function disclosureSportPaid(sportPrice: string, sportPack: string): string {
  return `${sportPrice} per year for ${sportPack}, charged to your card today and every year after until you cancel. Cancel online anytime in Settings. Canceling ends your access right away.`;
}

/** 3c acknowledgment. sportPack/sportPrice are only set for Base plus sport pack. */
export function ackSubject(): string {
  return "Your ROMRx subscription: terms and how to cancel";
}

export function ackLines(basePrice: string, sportPack?: string | null, sportPrice?: string | null): string[] {
  const combo = !!(sportPack && sportPrice);
  // Pack/combo ack output is unchanged (packs closed; pack lines out of this rev).
  if (combo) {
    return [
      `Plan: ROMRx Base + ${sportPack}`,
      "Free period: now through December 31, 2026. You will not be charged during the free period.",
      `After the free period: ${basePrice} per year for Base plus ${sportPrice} per year for ${sportPack}, charged to your card on file on January 1, 2027.`,
      "Renewal: your plan renews automatically every year at the same price until you cancel. We will tell you before any price change.",
      `How to cancel: cancel online anytime at ${CANCEL_LINK} or in the app under Settings > Subscription > Cancel subscription. You can also email ${SUPPORT_EMAIL} with the subject "Cancel."`,
      "Cancel before January 1, 2027 and you will not be charged anything.",
      "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
      "Canceling Base also cancels any sport packs.",
      "Reminders: we will email you before your free period ends and before each yearly renewal.",
    ];
  }
  // S8 Base ack, verbatim from Stacy string set (ca-arl-3c-2027-03-01-v5, fixed-date).
  // Cascade line stays: code still cascades Base cancel to packs (Stacy: may stay while true).
  return [
    "Plan: ROMRx Base",
    "Beta launch trial period: free until March 1, 2027.",
    `First charge: ${basePrice} on March 1, 2027, for one year of ROMRx Base. No charge before then.`,
    `Renewal: your plan renews automatically every year on March 1 at ${basePrice} until you cancel. We will tell you before any price change.`,
    "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
    "Cancel before March 1, 2027 and you will not be charged anything.",
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Canceling Base also cancels any sport packs.",
    "Reminders: we will email you before your first charge and before each yearly renewal.",
  ];
}

/** 3c-2 sport-only acknowledgment. freePeriod=false gives the Jan 1, 2027+ variant from the plan.
 *  packCancelsAlone: the pack is its own Stripe subscription, so the [VERIFY] line applies (see create-portal-session v13). */
export function ackSportSubject(sportPack: string): string {
  return `Your ${sportPack} is unlocked: terms and how to cancel`;
}
export function ackSportUnlockLine(sportPack: string): string {
  return `Your ${sportPack} is unlocked.`;
}
export function ackSportLines(sportPrice: string, sportPack: string, freePeriod: boolean, packCancelsAlone: boolean): string[] {
  const lines = [
    `Plan: ${sportPack}, added to your ROMRx Base plan`,
    ...(freePeriod ? ["Free period: now through December 31, 2026. You will not be charged during the free period."] : []),
    freePeriod
      ? `After the free period: ${sportPrice} per year for ${sportPack}, charged to your card on file on January 1, 2027.`
      : `Price: ${sportPrice} per year for ${sportPack}, charged today and every year after on this date.`,
    `Renewal: your ${sportPack} renews automatically every year at the same price until you cancel. We will tell you before any price change.`,
    `How to cancel: cancel online anytime at ${CANCEL_LINK} or in the app under Settings > Subscription > Cancel subscription. You can also email ${SUPPORT_EMAIL} with the subject "Cancel."`,
    ...(freePeriod ? ["Cancel before January 1, 2027 and you will not be charged anything."] : []),
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Canceling Base also cancels any sport packs.",
    ...(packCancelsAlone ? [`Canceling ${sportPack} does not cancel your Base plan.`] : []),
    "Reminders: we will email you before your free period ends and before each yearly renewal.",
  ];
  return lines;
}

export function ackFooter(): string {
  return `ROMRx LLC, Dublin, Ohio. ${SUPPORT_EMAIL}. Full terms: ${LEGAL_URL}`;
}

const escHtml = (v: string): string =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** HTML render of the 3c block. Links are the same URLs/emails that appear in the text. */
export function ackHtml(basePrice: string, sportPack?: string | null, sportPrice?: string | null): string {
  return renderAckHtml(ackSubject(), null, ackLines(basePrice, sportPack, sportPrice));
}

/** HTML render of the 3c-2 sport-only email (unlock line on top, then the terms block). */
export function ackSportHtml(sportPrice: string, sportPack: string, freePeriod: boolean, packCancelsAlone: boolean): string {
  return renderAckHtml(ackSportSubject(sportPack), ackSportUnlockLine(sportPack), ackSportLines(sportPrice, sportPack, freePeriod, packCancelsAlone));
}

export function ackSportText(sportPrice: string, sportPack: string, freePeriod: boolean, packCancelsAlone: boolean): string {
  return [ackSportUnlockLine(sportPack), "", "Your subscription terms", ...ackSportLines(sportPrice, sportPack, freePeriod, packCancelsAlone).map((l) => `- ${l}`), "", ackFooter()].join("\n");
}

function renderAckHtml(subject: string, leadLine: string | null, lines: string[]): string {
  const linkify = (s: string) =>
    escHtml(s)
      .replace(CANCEL_LINK, `<a href="${CANCEL_LINK}" style="color:#0047AB;">${CANCEL_LINK}</a>`)
      .replace(SUPPORT_EMAIL, `<a href="mailto:${SUPPORT_EMAIL}?subject=Cancel" style="color:#0047AB;">${SUPPORT_EMAIL}</a>`);
  const items = lines
    .map((l) => `<li style="margin:0 0 10px 0;">${linkify(l)}</li>`)
    .join("\n");
  const footer = escHtml(ackFooter())
    .replace(SUPPORT_EMAIL, `<a href="mailto:${SUPPORT_EMAIL}" style="color:#666666;">${SUPPORT_EMAIL}</a>`)
    .replace(LEGAL_URL, `<a href="${LEGAL_URL}" style="color:#666666;">${LEGAL_URL}</a>`);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
        <tr><td style="background-color:#0047AB;padding:24px 32px;">
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">ROMRx</h1>
        </td></tr>
        <tr><td style="padding:32px;">
${leadLine ? `          <p style="font-size:17px;color:#1a1a1a;font-weight:700;margin:0 0 20px 0;">${escHtml(leadLine)}</p>\n` : ""}          <h2 style="font-size:20px;color:#1a1a1a;margin:0 0 16px 0;">Your subscription terms</h2>
          <ul style="font-size:16px;color:#333333;line-height:1.55;margin:0;padding-left:20px;">
${items}
          </ul>
        </td></tr>
        <tr><td style="background-color:#f9f9f9;padding:20px 32px;border-top:1px solid #eeeeee;">
          <p style="font-size:13px;color:#666666;margin:0;line-height:1.6;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text part of the 3c email. */
export function ackText(basePrice: string, sportPack?: string | null, sportPrice?: string | null): string {
  return ["Your subscription terms", ...ackLines(basePrice, sportPack, sportPrice).map((l) => `- ${l}`), "", ackFooter()].join("\n");
}

// ---------------------------------------------------------------------------------------------------------------
// ARL-PAID-STRINGS-MAR1 (append only; every line above is byte-unchanged). Stacy 1518 Part D (sha 66272c03), D1, D3, D4,
// verbatim. From 1803920400 (Mar 1, 2027 12:00 PM ET) checkout charges at sign-up: no trial, no closure (Sable L1487/L1489).
// Keyed on now >= BETA_TRIAL_END_UNIX for checkout; the ack is keyed on the session's recorded arl_version (falls back
// to the clock only when the session has none), so a delayed webhook across noon still gets the matching text.
export const ARL_DISCLOSURE_VERSION_PAID = "ca-arl-3b-2027-03-01-paid-v1";
export const ARL_ACK_VERSION_PAID = "ca-arl-3c-2027-03-01-paid-v1";

/** true from 1803920400 on (the same instant inFreePeriod() turns false). */
export function inPaidPeriod(nowMs: number = Date.now()): boolean {
  return !inFreePeriod(nowMs);
}

/** D1 checkout disclosure (Stripe custom_text.submit), Base only, paid. */
export function disclosureBasePaid(basePrice: string): string {
  return `${basePrice} per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.`;
}

/** D3 consent box (Stripe terms_of_service_acceptance), paid. */
export function consentTextBasePaid(basePrice: string): string {
  return `I agree that ROMRx Base renews automatically every year at ${basePrice} until I cancel, and I agree to the [Terms](https://romrx.io/legal).`;
}

/** D4 ack lines, paid (1414 P5 verbatim). Subject is ackSubject(). */
export function ackLinesBasePaid(basePrice: string): string[] {
  return [
    "Plan: ROMRx Base",
    `Charged today: ${basePrice} for one year of ROMRx Base.`,
    `Renewal: your plan renews automatically every year on this date at ${basePrice} until you cancel. We will tell you before any price change.`,
    "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Reminders: we will email you before each yearly renewal.",
  ];
}
export function ackHtmlBasePaid(basePrice: string): string {
  return renderAckHtml(ackSubject(), null, ackLinesBasePaid(basePrice));
}
export function ackTextBasePaid(basePrice: string): string {
  return ["Your subscription terms", ...ackLinesBasePaid(basePrice).map((l) => `- ${l}`), "", ackFooter()].join("\n");
}

/** Checkout selector (Base only): version + disclosure + consent + whether to send trial_end. */
export function baseCheckoutCopy(basePrice: string, nowMs: number = Date.now()):
  { version: string; disclosure: string; consent: string; trialEndUnix: number | null } {
  return inPaidPeriod(nowMs)
    ? { version: ARL_DISCLOSURE_VERSION_PAID, disclosure: disclosureBasePaid(basePrice), consent: consentTextBasePaid(basePrice), trialEndUnix: null }
    : { version: ARL_DISCLOSURE_VERSION, disclosure: disclosureBase(basePrice), consent: ARL_CONSENT_TEXT, trialEndUnix: BETA_TRIAL_END_UNIX };
}

/** Webhook ack selector (Base only). sessionVersion = the Checkout Session's metadata.arl_version. */
export function baseAckCopy(basePrice: string, sessionVersion: string | null | undefined, nowMs: number = Date.now()):
  { version: string; html: string; text: string } {
  const paid = sessionVersion === ARL_DISCLOSURE_VERSION_PAID ||
    (!sessionVersion && inPaidPeriod(nowMs));
  return paid
    ? { version: ARL_ACK_VERSION_PAID, html: ackHtmlBasePaid(basePrice), text: ackTextBasePaid(basePrice) }
    : { version: ARL_ACK_VERSION, html: ackHtml(basePrice), text: ackText(basePrice) };
}
