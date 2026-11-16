// send-renewal-reminders email rendering (split out of index.ts 2026-11-15 so it can be rendered and tested without I/O).
// Sport brands and buildEmail() are the v26 code moved here unchanged (sport output is byte-identical to v26).
// New: the ROMRx Base brand (BRAND_BASE), buildBaseEmail() / buildBaseText(), and brandFor() routing non-sport users to Base.
// Base conventions reused from live stripe-webhook v53 (BRAND_HQ sender "ROMRx <hello@romrx.io>", accent #0047AB) and
// _shared/arl_copy.ts (CANCEL_LINK, LEGAL_URL, SUPPORT_EMAIL, "Settings > Subscription > Cancel subscription").
// Fine print: L1014 (all sales final, cancel anytime, paid once for the year, no refund), words from romrx.io/legal line 57.
import { POSTAL_LINE } from "../_shared/email_footer.ts";

/** Same values as live _shared/arl_copy.ts (stripe-webhook v53). */
export const BASE_MANAGE_URL = "https://romrx.io/app/dashboard/settings";
export const BASE_LEGAL_URL = "https://romrx.io/legal";
export const BASE_SUPPORT_EMAIL = "hello@romrx.io";

export const BRAND_BASE: Brand = {
  key: "base",
  name: "ROMRx Base",
  brandHtml: "ROMRx",
  from: "ROMRx <hello@romrx.io>",
  replyTo: "hello@romrx.io",
  domain: "https://romrx.io",
};

export interface Brand { key: "bjj" | "bodybuilding" | "base"; name: string; brandHtml: string; from: string; replyTo: string; domain: string; }
export const BRANDS: Record<"bjj" | "bodybuilding", Brand> = {
  bjj: {
    key: "bjj",
    name: "ROMRxBJJ",
    brandHtml: 'ROMRx<sup style="font-size:11px;font-weight:400;">BJJ</sup>',
    from: "Jim Scott <jim@romrxbjj.com>",
    replyTo: "jim@romrxbjj.com",
    domain: "https://romrxbjj.com",
  },
  bodybuilding: {
    key: "bodybuilding",
    name: "ROMRxBodybuilding",
    brandHtml: 'ROMRx<sup style="font-size:11px;font-weight:400;">Bodybuilding</sup>',
    from: "Jim Scott <jim@romrxbodybuilding.com>",
    replyTo: "jim@romrxbodybuilding.com",
    domain: "https://romrxbodybuilding.com",
  },
};
/**
 * Base-brand fix (2026-11-15): a sport brand ONLY for an exact sport value. Every other value (null, "", "general",
 * anything unknown) is a Base-only recipient and gets the ROMRx Base brand. v26 sent all of those to BJJ.
 */
export function brandFor(sport?: string | null): Brand {
  if (sport === "bodybuilding") return BRANDS.bodybuilding;
  if (sport === "bjj") return BRANDS.bjj;
  return BRAND_BASE;
}


/** Sport (BJJ / Bodybuilding) reminder HTML: v26 template, unchanged byte for byte. */
export function buildEmail(brand: Brand, name: string, plan: string, price: string, daysUntil: number, expiryDateStr: string, reminderLabel: string, email: string): string {
  const urgency = daysUntil <= 2;
  const accentColor = urgency ? "#dc2626" : "#008080";
  const dashboardUrl = `${brand.domain}/dashboard/settings`;
  const bodyMessage = daysUntil <= 2
    ? `This is your final reminder. Your ${plan} membership renews on <strong>${expiryDateStr}</strong> and you will be charged <strong>${price}</strong>. If you do not wish to renew, cancel before that date in your account settings.`
    : daysUntil <= 30
    ? `As required by law, we are notifying you that your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong> unless you cancel before that date.`
    : `Your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong>. If you want to cancel, you have time to do so in your account settings.`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fcfc;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;"><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e2e;">${brand.brandHtml}</span></div>
  <div style="background:#fff;border-radius:12px;border:1px solid #cde0e0;padding:32px;">
    <div style="display:inline-block;background:${accentColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:20px;">Renewal in ${reminderLabel}</div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a2e2e;margin:0 0 12px;">Hey ${name},</h1>
    <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin:0 0 16px;">${bodyMessage}</p>
    <div style="background:#f8fcfc;border-radius:10px;border:1px solid #cde0e0;padding:16px 20px;margin:20px 0;">
      <table style="width:100%;font-size:13px;">
        <tr><td style="color:#5a7070;padding:4px 0;">Plan</td><td style="text-align:right;font-weight:600;color:#1a2e2e;">${plan}</td></tr>
        <tr><td style="color:#5a7070;padding:4px 0;">Renewal date</td><td style="text-align:right;font-weight:600;color:#1a2e2e;">${expiryDateStr}</td></tr>
        <tr><td style="color:#5a7070;padding:4px 0;">Amount</td><td style="text-align:right;font-weight:700;color:${accentColor};font-size:15px;">${price}</td></tr>
      </table>
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#1a2e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;">Manage Subscription</a>
    <p style="font-size:11px;color:#5a7070;margin-top:24px;line-height:1.6;">To cancel, go to Settings and click Manage Subscription before your renewal date. All sales are final per our <a href="${brand.domain}/legal" style="color:#008080;">Refund Policy</a>.</p>
  </div>
  <p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">${POSTAL_LINE}<br /><a href="mailto:${brand.replyTo}" style="color:#008080;">${brand.replyTo}</a></p>
<p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">This message was sent to ${email}.</p></div></body></html>`;
}

/** Subject line. Same expression v26 had inline in index.ts. */
export function subjectFor(brand: Brand, daysUntil: number, label: string): string {
  return daysUntil <= 2
    ? `Your ${brand.name} membership renews in ${label} - last chance to cancel`
    : `Your ${brand.name} membership renews in ${label}`;
}

const esc = (v: string): string =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Body sentence, same three v26 windows (wording unchanged). Plain text; the HTML version bolds date and price. */
function baseBody(plan: string, price: string, daysUntil: number, date: string, bold: (s: string) => string): string {
  return daysUntil <= 2
    ? `This is your final reminder. Your ${plan} membership renews on ${bold(date)} and you will be charged ${bold(price)}. If you do not wish to renew, cancel before that date in your account settings.`
    : daysUntil <= 30
    ? `As required by law, we are notifying you that your ${plan} membership renews on ${bold(date)}. You will be charged ${bold(price)} unless you cancel before that date.`
    : `Your ${plan} membership renews on ${bold(date)}. You will be charged ${bold(price)}. If you want to cancel, you have time to do so in your account settings.`;
}

/** Base fine print (L1014). Sentences 3-4 reuse romrx.io/legal line 57-58; cancel path matches live arl_copy. */
export function baseFinePrint(): string[] {
  return [
    `Cancel anytime online at ${BASE_MANAGE_URL} or in the app under Settings > Subscription > Cancel subscription. Cancel before your renewal date and you will not be charged.`,
    "All sales are final. Your plan is paid once for the year.",
    "Except where required by law, ROMRx LLC does not provide refunds, credits, or prorated amounts, including unused portions of an annual term or after you cancel.",
    "When you cancel, your access ends right away and future renewals stop.",
    `Full terms: our Refund Policy at ${BASE_LEGAL_URL}.`,
  ];
}

/** ROMRx Base reminder HTML (layout follows the live Base ARL acknowledgment email). */
export function buildBaseEmail(name: string, plan: string, price: string, daysUntil: number, expiryDateStr: string, reminderLabel: string, email: string): string {
  const b = BRAND_BASE;
  const urgent = daysUntil <= 2;
  const accent = urgent ? "#dc2626" : "#0047AB";
  const body = baseBody(esc(plan), esc(price), daysUntil, esc(expiryDateStr), (s) => `<strong>${s}</strong>`);
  const fine = baseFinePrint().map((l) => esc(l)
    .replace(BASE_MANAGE_URL, `<a href="${BASE_MANAGE_URL}" style="color:#0047AB;">${BASE_MANAGE_URL}</a>`)
    .replace(`Refund Policy at ${BASE_LEGAL_URL}`, `<a href="${BASE_LEGAL_URL}" style="color:#0047AB;">Refund Policy</a> at ${BASE_LEGAL_URL}`)).join(" ");
  const subject = subjectFor(b, daysUntil, reminderLabel);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
        <tr><td style="background-color:#0047AB;padding:24px 32px;">
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">${b.brandHtml}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="display:inline-block;background:${accent};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:20px;">Renewal in ${esc(reminderLabel)}</div>
          <p style="font-size:17px;color:#1a1a1a;font-weight:700;margin:0 0 12px 0;">Hey ${esc(name)},</p>
          <p style="font-size:16px;color:#333333;line-height:1.55;margin:0 0 16px 0;">${body}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;margin:20px 0;">
            <tr><td style="color:#666666;padding:10px 16px 4px;">Plan</td><td style="text-align:right;font-weight:700;color:#1a1a1a;padding:10px 16px 4px;">${esc(plan)}</td></tr>
            <tr><td style="color:#666666;padding:4px 16px;">Renewal date</td><td style="text-align:right;font-weight:700;color:#1a1a1a;padding:4px 16px;">${esc(expiryDateStr)}</td></tr>
            <tr><td style="color:#666666;padding:4px 16px 10px;">Amount</td><td style="text-align:right;font-weight:700;color:${accent};font-size:15px;padding:4px 16px 10px;">${esc(price)}</td></tr>
          </table>
          <a href="${BASE_MANAGE_URL}" style="display:inline-block;background-color:#0047AB;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:700;">Manage Subscription</a>
          <p style="font-size:12px;color:#666666;margin:24px 0 0 0;line-height:1.6;">${fine}</p>
        </td></tr>
        <tr><td style="background-color:#f9f9f9;padding:20px 32px;border-top:1px solid #eeeeee;">
          <p style="font-size:12px;color:#666666;margin:0;line-height:1.6;text-align:center;">${esc(POSTAL_LINE)}<br /><a href="mailto:${BASE_SUPPORT_EMAIL}" style="color:#666666;">${BASE_SUPPORT_EMAIL}</a><br />This message was sent to ${esc(email)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** ROMRx Base reminder plain-text part (same words as the HTML). */
export function buildBaseText(name: string, plan: string, price: string, daysUntil: number, expiryDateStr: string, reminderLabel: string, email: string): string {
  return [
    "ROMRx",
    `Renewal in ${reminderLabel}`,
    "",
    `Hey ${name},`,
    "",
    baseBody(plan, price, daysUntil, expiryDateStr, (s) => s),
    "",
    `Plan: ${plan}`,
    `Renewal date: ${expiryDateStr}`,
    `Amount: ${price}`,
    "",
    `Manage Subscription: ${BASE_MANAGE_URL}`,
    "",
    ...baseFinePrint(),
    "",
    POSTAL_LINE,
    BASE_SUPPORT_EMAIL,
    `This message was sent to ${email}.`,
  ].join("\n");
}
