// lifecycle-emails copy and HTML (FG-09/10/11). ALL USER-FACING WORDS BELOW ARE STACY'S DRAFTS (STACY-FG-PRIORITY-CRITERIA
// section 5) AND ARE "NEEDS JIM WORDING / Stacy clearance needed" until Jim approves them. Nothing here has been sent.
// No scores, joint names or mood words in subject or preheader. No tracking pixels. No click-tracked links. No em dashes.
import type { Due, Kind } from "./logic.ts";
import { SCORE_LABEL } from "./score.ts";

export interface Brand { key: "bjj" | "bodybuilding" | "base"; name: string; from: string; replyTo: string; appBase: string; settingsPath: string; }
export const BRANDS: Record<string, Brand> = {
  bjj: { key: "bjj", name: "ROMRxBJJ", from: "Jim Scott <jim@romrxbjj.com>", replyTo: "jim@romrxbjj.com", appBase: "https://romrxbjj.com", settingsPath: "/dashboard/settings" },
  bodybuilding: { key: "bodybuilding", name: "ROMRxBodybuilding", from: "Jim Scott <jim@romrxbodybuilding.com>", replyTo: "jim@romrxbodybuilding.com", appBase: "https://romrxbodybuilding.com", settingsPath: "/dashboard/settings" },
  // Base sender = the same From send-renewal-reminders v6 uses for Base subscribers (its brandFor falls back to the BJJ brand). Grant's call 6:32 PM.
  base: { key: "base", name: "ROMRx", from: "Jim Scott <jim@romrxbjj.com>", replyTo: "jim@romrxbjj.com", appBase: "https://romrx.io/app", settingsPath: "/dashboard/settings" },
};
export function brandFor(sport: string | null | undefined): Brand {
  if (sport === "bodybuilding") return BRANDS.bodybuilding;
  if (sport === "bjj") return BRANDS.bjj;
  return BRANDS.base;
}

type StaticKind = "retest" | "protocol" | "digest";
export const COPY: Record<StaticKind, { subject: string; preheader: string; lines: (d: Due) => string[]; button: string; path: string; why: string; off: string }> = {
  retest: {
    subject: "Time for your ROMRx retest",
    preheader: "Your 6-week check-in is ready when you are.",
    lines: () => ["It has been about six weeks since your last ROMRx assessment. Your retest is ready whenever you are."],
    button: "Start my retest", path: "/onboarding/assessment",
    why: "You are getting this because Retest reminders is on in your settings.", off: "Turn off retest reminders",
  },
  protocol: {
    subject: "Today is a protocol day",
    preheader: "Your ROMRx session is ready.",
    lines: () => ["Today is a protocol day on your ROMRx plan."],
    button: "Open today's session", path: "/dashboard/my-protocol",
    why: "You are getting this because Email reminders is on in your settings.", off: "Turn off protocol reminders",
  },
  digest: {
    subject: "Your ROMRx week",
    preheader: "Your week in ROMRx.",
    lines: (d) => {
      const x = d.digest!;
      // The number is the apps' /100 score and the label is the one the app shows (score.ts, one place). Delta is against the PREVIOUS assessment. NEEDS JIM WORDING (off).
      const trend = x.delta === null ? "" : x.delta > 0 ? `, up ${x.delta} since your previous assessment` : x.delta < 0 ? `, down ${Math.abs(x.delta)} since your previous assessment` : ", unchanged since your previous assessment";
      // P1-15: Stacy CLEAR (ruling 8ce215ca). Words byte-identical to the current previews.
      const extra: string[] = [];
      if (typeof x.sessions_this_week === "number") extra.push(`Sessions this week: ${x.sessions_this_week}.`);
      if (typeof x.days_to_next_check === "number") {
        extra.push(x.days_to_next_check <= 0 ? "Your next check is today." : `Your next check is in ${x.days_to_next_check} ${x.days_to_next_check === 1 ? "day" : "days"}.`);
      }
      return ["Here is your ROMRx week.", `${SCORE_LABEL[brandFor(d.active_sport).key]}: ${x.score}${trend}.`, `Current streak: ${x.streak} ${x.streak === 1 ? "day" : "days"}.`, ...extra];
    },
    button: "Open ROMRx", path: "/dashboard",
    why: "You are getting this because Weekly progress digest is on in your settings.", off: "Turn off the weekly digest",
  },
};
export const ALL_OFF_TEXT = "Turn off all ROMRx emails except account and billing notices"; // NEEDS JIM WORDING (Stacy checklist item, 7704(a)(3)(B))

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");


export interface CopySpec {
  subject: string; preheader: string; lines: string[]; button: string; path: string;
  why: string; off: string; afterButton?: string[]; sentTo: boolean;
}

/** Stacy P1-16 final words, used exactly. Jim wording yes still required before any send. */
export function copyFor(d: Due, brand?: Brand): CopySpec {
  if (d.kind === "lapsed") {
    const settings = brand ? `${brand.appBase}${brand.settingsPath}` : "/dashboard/settings";
    return {
      subject: "Your ROMRx plan is still here",
      preheader: "Pick up where you left off.",
      lines: [
        "We haven't seen you in a couple of weeks. Your plan is saved and ready.",
        "You can start again with today's session.",
        ...(d.next_check_line ? [d.next_check_line] : []),
      ],
      button: "Open today's session", path: "/dashboard/my-protocol",
      why: "You're getting this because Plan day reminders is on in your ROMRx settings.",
      off: "Turn off plan day reminders",
      afterButton: [`Want fewer emails? Change your reminders in Settings: ${settings}`],
      sentTo: true,
    };
  }
  const c = COPY[d.kind as StaticKind];
  return { subject: c.subject, preheader: c.preheader, lines: c.lines(d), button: c.button, path: c.path, why: c.why, off: c.off, sentTo: false };
}

export interface Built { subject: string; html: string; text: string; headers: Record<string, string>; }
export function buildEmail(d: Due, brand: Brand, links: { offKind: string; offAll: string; oneClick: string }, postalLine: string): Built {
  const c = copyFor(d, brand);
  const open = `${brand.appBase}${c.path}`;
  const hello = `Hi ${esc(d.first_name)},`;
  const after = (c.afterButton ?? []).map((l) => `    <p style="font-size:12px;color:#5a7070;margin-top:16px;line-height:1.6;">${esc(l)}</p>`).join("\n");
  const sentTo = c.sentTo ? `This message was sent to ${d.email}.` : "";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fcfc;font-family:Inter,system-ui,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(c.preheader)}</div>
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;"><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e2e;">${esc(brand.name)}</span></div>
  <div style="background:#fff;border-radius:12px;border:1px solid #cde0e0;padding:32px;">
    <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin:0 0 12px;">${hello}</p>
${c.lines.map((l) => `    <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin:0 0 12px;">${esc(l)}</p>`).join("\n")}
    <a href="${esc(open)}" style="display:inline-block;background:#1a2e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;margin-top:8px;">${esc(c.button)}</a>${after ? "\n" + after : ""}
    <p style="font-size:12px;color:#5a7070;margin-top:24px;line-height:1.6;">${esc(c.why)} <a href="${esc(links.offKind)}" style="color:#008080;">${esc(c.off)}</a></p>
    <p style="font-size:12px;color:#5a7070;line-height:1.6;"><a href="${esc(links.offAll)}" style="color:#008080;">${esc(ALL_OFF_TEXT)}</a></p>
  </div>
  <p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">${esc(postalLine)}<br /><a href="mailto:${esc(brand.replyTo)}" style="color:#008080;">${esc(brand.replyTo)}</a>${c.sentTo ? `<br />${esc(sentTo)}` : ""}</p>
</div></body></html>`;
  const textParts = [hello.replace(/&amp;/g, "&"), "", ...c.lines, "", `${c.button}: ${open}`];
  if (c.afterButton?.length) textParts.push("", ...c.afterButton);
  textParts.push("", `${c.why} ${c.off}: ${links.offKind}`, `${ALL_OFF_TEXT}: ${links.offAll}`, "", postalLine);
  if (c.sentTo) textParts.push(brand.replyTo, sentTo);
  const text = textParts.join("\n");
  return {
    subject: c.subject, html, text,
    // RFC 8058 one-click: the header URL takes a POST only (a GET to it redirects to the confirm page and applies nothing). Signed scoped token only, no email address.
    headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
