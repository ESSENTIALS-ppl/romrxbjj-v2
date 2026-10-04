// _shared/prerenewal_copy.ts - Base pre-renewal ("your free period ends, here is the charge") reminder.
// DRAFT: wording is NOT approved. Stacy owns the final text. While PREREMINDER_COPY_APPROVED is false the
// subject carries a "[DRAFT]" prefix and the stripe-webhook handler stays off unless PREREMINDER_ENABLED=true.
// Pure functions only (no network) so they can be unit-tested. No em dashes. American spelling.
import { CANCEL_LINK, SUPPORT_EMAIL, LEGAL_URL, SPORT_PACK_NAMES, formatUsd } from "./arl_copy.ts";
import { POSTAL_LINE } from "./email_footer.ts";

export const PREREMINDER_COPY_APPROVED = false; // flip to true only after Stacy signs off the wording below
export const PREREMINDER_COPY_VERSION = "base-prerenewal-DRAFT-2026-10-03-v1";
export const PREREMINDER_EMAIL_ID = "base_trial_will_end";

const esc = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function chargeDateLabel(trialEndUnix: number): string {
  return new Date(trialEndUnix * 1000).toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" });
}
/** Last day of the free period, in New York time (trial_end is noon ET on the charge date). */
export function freePeriodEndLabel(trialEndUnix: number): string {
  return new Date((trialEndUnix - 24 * 3600) * 1000).toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" });
}

export function reminderSubject(trialEndUnix: number): string {
  return `${PREREMINDER_COPY_APPROVED ? "" : "[DRAFT] "}Your ROMRx plan renews on ${chargeDateLabel(trialEndUnix)}`;
}

export function reminderLines(trialEndUnix: number, basePrice: string, sportPack?: string | null, sportPrice?: string | null): string[] {
  const combo = !!(sportPack && sportPrice);
  const when = chargeDateLabel(trialEndUnix);
  return [
    `Plan: ROMRx Base${combo ? ` + ${sportPack}` : ""}`,
    `Your free period ends on ${freePeriodEndLabel(trialEndUnix)}.`,
    `On ${when} we will charge your card on file ${basePrice} for ROMRx Base${combo ? ` plus ${sportPrice} for ${sportPack}` : ""}, for one year.`,
    "Renewal: your plan then renews automatically every year at the same price until you cancel. We will tell you before any price change.",
    `How to cancel: cancel online anytime at ${CANCEL_LINK} or in the app under Settings > Subscription > Cancel subscription. You can also email ${SUPPORT_EMAIL} with the subject "Cancel."`,
    `Cancel before ${when} and you will not be charged anything.`,
    "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
    ...(combo ? ["Canceling Base also cancels any sport packs."] : []),
  ];
}

export function reminderFooter(): string {
  return `${POSTAL_LINE}. ${SUPPORT_EMAIL}. Full terms: ${LEGAL_URL}`;
}

export function reminderText(trialEndUnix: number, basePrice: string, sportPack?: string | null, sportPrice?: string | null): string {
  return [
    `${PREREMINDER_COPY_APPROVED ? "" : "[DRAFT wording, pending Stacy] "}Your free period is ending. Here is what happens next.`,
    "",
    ...reminderLines(trialEndUnix, basePrice, sportPack, sportPrice).map((l) => `- ${l}`),
    "",
    reminderFooter(),
  ].join("\n");
}

export function reminderHtml(trialEndUnix: number, basePrice: string, sportPack?: string | null, sportPrice?: string | null): string {
  const linkify = (s: string) =>
    esc(s)
      .replace(CANCEL_LINK, `<a href="${CANCEL_LINK}" style="color:#0047AB;">${CANCEL_LINK}</a>`)
      .replace(SUPPORT_EMAIL, `<a href="mailto:${SUPPORT_EMAIL}?subject=Cancel" style="color:#0047AB;">${SUPPORT_EMAIL}</a>`);
  const items = reminderLines(trialEndUnix, basePrice, sportPack, sportPrice).map((l) => `<li style="margin:0 0 10px 0;">${linkify(l)}</li>`).join("\n");
  const footer = esc(reminderFooter())
    .replace(SUPPORT_EMAIL, `<a href="mailto:${SUPPORT_EMAIL}" style="color:#666666;">${SUPPORT_EMAIL}</a>`)
    .replace(LEGAL_URL, `<a href="${LEGAL_URL}" style="color:#666666;">${LEGAL_URL}</a>`);
  const draftBanner = PREREMINDER_COPY_APPROVED ? "" : `<tr><td style="background-color:#fff3cd;padding:10px 32px;font-size:12px;color:#7a5b00;">DRAFT wording, pending Stacy's approval.</td></tr>\n        `;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(reminderSubject(trialEndUnix))}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
        ${draftBanner}<tr><td style="background-color:#0047AB;padding:24px 32px;">
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">ROMRx</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:17px;color:#1a1a1a;font-weight:700;margin:0 0 20px 0;">Your free period is ending. Here is what happens next.</p>
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

export type ReminderDecision =
  | { send: false; reason: string }
  | { send: true; userId: string; basePrice: string; sportPack: string | null; sportPrice: string | null; trialEnd: number };

/**
 * Decide from a Stripe Subscription object (the trial_will_end event payload) whether to send.
 * Pure: no network. nowMs is injectable for tests.
 *  - non-Base (no purpose=base / user_id), already canceled or cancel scheduled, not trialing, no trial_end: skip.
 *  - subscription created less than 24h ago: skip (Stripe fires trial_will_end immediately when the trial is shorter
 *    than its lead time, e.g. a signup on Dec 30; the 3c acknowledgment email just went out).
 */
export function decideReminder(sub: Record<string, unknown>, nowMs: number = Date.now()): ReminderDecision {
  const meta = (sub.metadata ?? {}) as Record<string, string>;
  const userId = meta.user_id ?? meta.supabase_user_id ?? "";
  if ((meta.purpose ?? "").toLowerCase() !== "base" || !userId) return { send: false, reason: "not_base" };
  if (sub.status !== "trialing") return { send: false, reason: `status_${String(sub.status)}` };
  if (sub.cancel_at_period_end === true || sub.cancel_at || sub.canceled_at) return { send: false, reason: "cancel_scheduled_or_canceled" };
  const trialEnd = typeof sub.trial_end === "number" ? sub.trial_end : 0;
  if (!trialEnd) return { send: false, reason: "no_trial_end" };
  const created = typeof sub.created === "number" ? sub.created : 0;
  if (created && nowMs - created * 1000 < 24 * 3600 * 1000) return { send: false, reason: "created_under_24h_ack_just_sent" };
  const data = ((sub.items as { data?: { price?: { unit_amount?: number | null } }[] } | undefined)?.data) ?? [];
  const amounts = data.map((i) => i.price?.unit_amount ?? 0).filter((n) => n > 0);
  if (!amounts.length) return { send: false, reason: "no_price_amounts" };
  const pending = meta.pending_sport === "bjj" || meta.pending_sport === "bodybuilding" ? meta.pending_sport : null;
  const sportPack = amounts.length > 1 ? (pending ? SPORT_PACK_NAMES[pending] : "your sport pack") : null;
  return {
    send: true, userId, trialEnd,
    basePrice: formatUsd(amounts[0]),
    sportPack,
    sportPrice: sportPack ? formatUsd(amounts[1]) : null,
  };
}

