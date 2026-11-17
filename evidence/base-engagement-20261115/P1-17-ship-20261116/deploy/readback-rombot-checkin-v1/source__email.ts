// P1-17 day 3 email fallback (Base only). Layout follows lifecycle-emails buildEmail (live v3); words come from copy.ts only.
// No tracking pixels, no click tracking, no em dashes. One-click unsubscribe (RFC 8058) with a signed "protocol" scope token:
// the Plan day reminders toggle (email_reminders) this email depends on. Uses the live unsubscribe v13 scopes as they are.
import { EMAIL_OPENER, FOOTER, type Rendered } from "./copy.ts";
import { APP_PATH } from "./logic.ts";

/** P1-08 Base sender, the same value as ROMRX_SENDER in b19b13dca82a3c2eb34a641aa5ca79e410090c00
 *  (lifecycle-emails/source/email.ts). Defined here so this function does not depend on that deploy. A test pins the two equal
 *  whenever lifecycle-emails exports it. Reply-To hello@romrx.io per Jim 9:42 AM ET Nov 16 ("Replies go to hello@, Reid triages them
 *  from my inbox."). HELD with P1-08: no send before Jim's sender yes is relayed. */
export const ROMRX_SENDER = { from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io" } as const;
export const BASE_BRAND = { key: "base", name: "ROMRx", appBase: "https://romrx.io/app" } as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Stacy (Nov 16 answer): the email-level "ROMBot here." opener is dropped for Branch A ONLY, because A's own first line
 *  already says it ("Hey {first_name}, ROMBot here." / "Hey there, ROMBot here."). B and C keep it. */
export function opener(r: Rendered): boolean { return r.branch !== "A"; }

export interface Built { from: string; replyTo: string; subject: string; html: string; text: string; headers: Record<string, string>; }
export function buildCheckinEmail(r: Rendered, to: string, links: { offKind: string; offAll: string; oneClick: string }, postalLine: string): Built {
  const open = `${BASE_BRAND.appBase}${APP_PATH}`;
  const p = (s: string) => `    <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin:0 0 12px;">${esc(s)}</p>`;
  const sentTo = FOOTER.sentTo(to);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fcfc;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;"><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e2e;">${esc(BASE_BRAND.name)}</span></div>
  <div style="background:#fff;border-radius:12px;border:1px solid #cde0e0;padding:32px;">
${opener(r) ? p(EMAIL_OPENER) + "\n" : ""}${p(r.line1)}
    <a href="${esc(open)}" style="display:inline-block;background:#1a2e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;margin:8px 0 12px;">${esc(r.button)}</a>
${p(r.line3)}
    <p style="font-size:12px;color:#5a7070;margin-top:24px;line-height:1.6;">${esc(FOOTER.why)} <a href="${esc(links.offKind)}" style="color:#008080;">${esc(FOOTER.off)}</a></p>
    <p style="font-size:12px;color:#5a7070;line-height:1.6;"><a href="${esc(links.offAll)}" style="color:#008080;">${esc(FOOTER.allOff)}</a></p>
  </div>
  <p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">${esc(postalLine)}<br /><a href="mailto:${esc(ROMRX_SENDER.replyTo)}" style="color:#008080;">${esc(ROMRX_SENDER.replyTo)}</a><br />${esc(sentTo)}</p>
</div></body></html>`;
  const text = [
    ...(opener(r) ? [EMAIL_OPENER, ""] : []), r.line1, "", `${r.button}: ${open}`, "", r.line3, "",
    `${FOOTER.why} ${FOOTER.off}: ${links.offKind}`, `${FOOTER.allOff}: ${links.offAll}`, "", postalLine, ROMRX_SENDER.replyTo, sentTo,
  ].join("\n");
  return {
    from: ROMRX_SENDER.from, replyTo: ROMRX_SENDER.replyTo, subject: r.subject, html, text,
    headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
