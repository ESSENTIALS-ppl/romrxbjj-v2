// _shared/arl_copy.ts - California auto-renewal (ARL) customer copy, Legal (Stacy) plan
// /workspace/stacy-research/ca-arl-plan-20260929.md sections 3b and 3c. Jim approved via Grant 2026-09-29.
// Customer-facing text below is Stacy's EXACT wording. Only the {placeholders} are filled in:
//   prices come from the live Stripe Price objects at runtime (never hardcoded), sport pack names
//   match the app labels. Do not edit wording here without a new Legal version string.
// No em dashes. American spelling ("canceling"), per Legal update 2026-09-29 (sections 3b-2 / 3c-2 added).
// v3: Jim decision (c) 2026-09-29, cancel ends access immediately, no refunds; Legal copy "Canceling ends your access
// right away." (3b) and the "When you cancel:" bullet (3c / 3c-2).

import { POSTAL_LINE } from "./email_footer.ts";

export const ARL_DISCLOSURE_VERSION = "ca-arl-3b-2026-09-29-v3";
export const ARL_ACK_VERSION = "ca-arl-3c-2026-09-29-v3";

/** Beta free period ends at this instant (2027-01-01 12:00 ET); same value as subscription_data.trial_end. */
export const BETA_TRIAL_END_UNIX = 1798822800;
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
  return `Free through December 31, 2026. Then ${basePrice} per year, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Canceling ends your access right away. Cancel before January 1, 2027 and you pay nothing.`;
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
  return [
    `Plan: ROMRx Base${combo ? ` + ${sportPack}` : ""}`,
    "Free period: now through December 31, 2026. You will not be charged during the free period.",
    `After the free period: ${basePrice} per year for Base${combo ? ` plus ${sportPrice} per year for ${sportPack}` : ""}, charged to your card on file on January 1, 2027.`,
    "Renewal: your plan renews automatically every year at the same price until you cancel. We will tell you before any price change.",
    `How to cancel: cancel online anytime at ${CANCEL_LINK} or in the app under Settings > Subscription > Cancel subscription. You can also email ${SUPPORT_EMAIL} with the subject "Cancel."`,
    "Cancel before January 1, 2027 and you will not be charged anything.",
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    "Canceling Base also cancels any sport packs.",
    "Reminders: we will email you before your free period ends and before each yearly renewal.",
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
  return `${POSTAL_LINE}. ${SUPPORT_EMAIL}. Full terms: ${LEGAL_URL}`;
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
