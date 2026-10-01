// _shared/nudge_copy.ts - email copy for the incomplete-assessment nudge (DRAFT, not deployed, nothing sent).
// Copy source: Kai INCOMPLETE-ASSESSMENT-EMAIL-DRAFT.md with Stacy's 2026-10-02 fixes applied.
// Rules: zero em dashes (also no en dashes), American spelling, no injury/performance/"fix" language,
// no billing copy, readiness words only Needs focus / Building / Steady.
import type { Stage } from "./nudge_rules.ts";

const ASSESSMENT_URL = "https://romrx.io/app/onboarding/assessment";
const UNSUB_PAGE = "https://romrx.io/app/unsubscribe"; // the page that works today (romrxbjj.com/unsubscribe 404s)

export const FROM = "Jim Scott <jim@romrx.io>";
export const REPLY_TO = "hello@romrx.io";

export function assessmentLink(stage: Stage, ymd: string): string {
  const content = `${ymd}_owned_${stage === "incomplete_a" ? "incomplete_t2h" : stage === "incomplete_b" ? "incomplete_t24h" : "incomplete_catchup"}_utm`;
  const q = new URLSearchParams({ utm_campaign: "ROMRx_Base_Beta_2026", utm_source: "owned", utm_medium: "email", utm_content: content, utm_term: "activation" });
  return `${ASSESSMENT_URL}?${q.toString()}`;
}
export const unsubscribePage = (email: string) => `${UNSUB_PAGE}?email=${encodeURIComponent(email)}`;

interface Copy { subject: string; preview: string; paras: string[]; bullets?: string[]; cta: string; closing: string; ps?: string }

const COPY: Record<Stage, Copy> = {
  incomplete_a: {
    subject: "Your assessment is waiting. About fifteen minutes.",
    preview: "Pick up where you left off. A daily plan built around your results.",
    paras: [
      "You started with ROMRx Base. You have not finished the assessment yet.",
      "It takes about fifteen minutes on your phone. You enter the numbers. No camera. When you finish, you get your Personalized Readiness Profile and a daily plan built around your results. Your results show each joint as Needs focus, Building, or Steady.",
      "This is mobility self-care for the long run, built to help you improve your range of motion. Results vary. You do not need to be an athlete.",
    ],
    cta: "Finish assessment",
    closing: "Talk soon,<br/>Jim<br/>ROMRx Base",
    ps: "P.S. Questions? Reply to this email.",
  },
  incomplete_b: {
    subject: "Still open: finish your Base assessment",
    preview: "Fifteen minutes. Then a daily plan built around your results.",
    paras: [
      "Quick nudge from Jim at ROMRx.",
      "Your Base signup is in. The assessment is still unfinished. Without it, we cannot build your Personalized Readiness Profile or point your daily minutes at the joints that Need focus first.",
      "Here is what finishing gives you:",
    ],
    bullets: [
      "Plain-language results on your joints: Needs focus, Building, or Steady",
      "A daily plan built around your results",
      "A short daily habit you can keep",
    ],
    cta: "Finish assessment",
    closing: "If now is a bad time, save this email and come back when you have a quiet stretch. The assessment waits for you.<br/><br/>Jim<br/>ROMRx Base",
  },
  incomplete_catchup: {
    subject: "Your ROMRx assessment is still waiting",
    preview: "About fifteen minutes whenever you are ready.",
    paras: [
      "You created a ROMRx Base account, and the assessment is still unfinished.",
      "It takes about fifteen minutes on your phone. You enter the numbers. No camera. When you finish, you get your Personalized Readiness Profile and a daily plan built around your results. Your results show each joint as Needs focus, Building, or Steady.",
      "This is the only reminder we will send about it.",
    ],
    cta: "Finish assessment",
    closing: "Jim<br/>ROMRx Base",
    ps: "P.S. Questions? Reply to this email.",
  },
};

export function buildEmail(stage: Stage, v: { firstName: string; email: string; ymd: string }): { subject: string; html: string; text: string; link: string } {
  const c = COPY[stage];
  const link = assessmentLink(stage, v.ymd);
  const unsub = unsubscribePage(v.email);
  const name = v.firstName || "there";
  const p = (t: string) => `<p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${t}</p>`;
  const bullets = c.bullets ? `<ul style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;padding-left:20px;">${c.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : "";
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${c.preview}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:32px 40px;">
${p(`Hey ${name},`)}${c.paras.map(p).join("")}${bullets}
<table cellpadding="0" cellspacing="0"><tr><td style="padding:8px 0 24px 0;"><a href="${link}" style="display:inline-block;background:#1e6fd9;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:6px;">${c.cta}</a></td></tr></table>
${p(`If the button does not work, open this link:<br/><a href="${link}" style="color:#1e6fd9;word-break:break-all;">${link}</a>`)}
<p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${c.closing}</p>
${c.ps ? `<p style="font-size:14px;color:#555555;line-height:1.6;margin:0;">${c.ps}</p>` : ""}
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eeeeee;">
<p style="font-size:12px;color:#777777;text-align:center;margin:0;line-height:1.6;">ROMRx LLC, Dublin, Ohio<br/>ROMRx is for adults 18 and older. You are getting this because you created a ROMRx account and have not finished your assessment.<br/><a href="${unsub}" style="color:#555555;">Stop these reminders</a> &nbsp;|&nbsp; Reply to this email or write hello@romrx.io</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [`Hey ${name},`, "", ...c.paras.map((t) => t.replace(/<[^>]+>/g, "")), ...(c.bullets ?? []).map((b) => `- ${b}`), "", `Finish assessment: ${link}`, "", c.closing.replace(/<br\/>/g, "\n"), c.ps ?? "", "", "ROMRx LLC, Dublin, Ohio", `Stop these reminders: ${unsub}`].join("\n");
  return { subject: c.subject, html, text, link };
}
