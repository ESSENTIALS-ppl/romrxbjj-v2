// LOCAL TEMPLATE RENDER ONLY for SEND-SWITCH v4. No network, no Resend, no database.
// Does not import handler.ts or index.ts. Does not call handle(), d.send(), d.claim(),
// d.release(), d.load(), cronOk, or fetch. The Resend call in source/index.ts:93-99
// (lifecycle) and source/index.ts:127-133 (rombot), and the email_sends insert in
// source/index.ts claim() (lifecycle :86-91, rombot :113-118), are never executed.
// Placeholder user only: user@example.com / Sam Example. Base brand only (hello@romrx.io).
// Source: ./src byte-copied from live extracts that hash-match get_edge_function
// lifecycle-emails v4 ezbr 6714009f... and rombot-checkin v1 ezbr fbad0021...

import { buildEmail, brandFor, type Due } from "./src/lifecycle-emails/source/email.ts";
import { POSTAL_LINE } from "./src/lifecycle-emails/_shared/email_footer.ts";
import { render, renderEmail, type Fill, type Branch } from "./src/rombot-checkin/source/copy.ts";
import { buildCheckinEmail } from "./src/rombot-checkin/source/email.ts";
import { noteContent, APP_PATH } from "./src/rombot-checkin/source/logic.ts";

// Fail closed if this script ever grew a network or DB call.
const fetchWas = globalThis.fetch;
globalThis.fetch = (() => { throw new Error("render-v4: fetch is disabled; no Resend, no DB"); }) as typeof fetch;

const EMAIL = "user@example.com";
const FIRST = "Sam";
const LINKS = {
  offKind: "https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND",
  offAll: "https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL",
  oneClick: "https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/unsubscribe?t=PLACEHOLDER_KIND&b=base",
};
const brand = brandFor(null); // Base only
if (brand.key !== "base" || brand.replyTo !== "hello@romrx.io") throw new Error("expected Base brand");

function lcDue(over: Partial<Due> & { kind: Due["kind"] }): Due {
  return {
    kind: over.kind,
    user_id: "00000000-0000-4000-8000-000000000001",
    email: EMAIL,
    first_name: FIRST,
    active_sport: null,
    email_id: "local-render-only",
    local_date: "2026-11-16",
    ...over,
  };
}

const out: Record<string, unknown>[] = [];

function recordLc(label: string, d: Due) {
  const built = buildEmail(d, brand, LINKS, POSTAL_LINE);
  out.push({
    family: "lifecycle",
    label,
    kind: d.kind,
    from: brand.from,
    replyTo: brand.replyTo,
    to: EMAIL,
    subject: built.subject,
    preheader: undefined,
    text: built.text,
    // html is in the object for hashing, but we also keep it
    html: built.html,
    headers: built.headers,
    resend_id: null,
    claimed_email_sends: false,
  });
}

recordLc("retest", lcDue({ kind: "retest" }));
recordLc("protocol", lcDue({ kind: "protocol" }));
recordLc("digest (score 72, up 3, streak 2, sessions 3, next check in 5 days)", lcDue({
  kind: "digest",
  digest: { score: 72, delta: 3, streak: 2, sessions_this_week: 3, days_to_next_check: 5 },
  next_check_line: "Your next check is in 5 days.",
}));
recordLc("lapsed (with upcoming check date)", lcDue({
  kind: "lapsed",
  next_check_line: "Your next check: Monday, December 28",
}));
recordLc("check7 Version A (with retest date)", lcDue({
  kind: "check7",
  retest_date: "Monday, December 28",
  quick_check_done: false,
}));
recordLc("check14 Version A (quick check not done, with retest date)", lcDue({
  kind: "check14",
  retest_date: "Monday, December 28",
  quick_check_done: false,
}));
recordLc("check14 Version B (quick check done, with next check date)", lcDue({
  kind: "check14",
  next_check_date: "Monday, December 28",
  quick_check_done: true,
}));

function fillOf(over: Partial<Fill> & { first_name: string | null; n: number }): Fill {
  return { today_area: "hips", next_check_date: "Monday, Dec 28", ...over };
}

function recordRb(label: string, branch: Branch, f: Fill) {
  const note = render(branch, f);
  const emailWords = renderEmail(branch, f);
  const built = buildCheckinEmail(emailWords, EMAIL, LINKS, POSTAL_LINE);
  out.push({
    family: "rombot-checkin",
    label,
    branch,
    n: f.n,
    named: !!f.first_name,
    note: { line1: note.line1, button: note.button, line3: note.line3, content: noteContent(note), app_path: APP_PATH },
    from: built.from,
    replyTo: built.replyTo,
    to: EMAIL,
    subject: built.subject,
    text: built.text,
    html: built.html,
    headers: built.headers,
    resend_id: null,
    claimed_email_sends: false,
  });
}

recordRb("A named (0 sessions)", "A", fillOf({ first_name: FIRST, n: 0 }));
recordRb("A no-name (0 sessions)", "A", fillOf({ first_name: null, n: 0 }));
recordRb("B n=1 named", "B", fillOf({ first_name: FIRST, n: 1 }));
recordRb("B n=1 no-name", "B", fillOf({ first_name: null, n: 1 }));
recordRb("B n=2 named", "B", fillOf({ first_name: FIRST, n: 2 }));
recordRb("B n=2 no-name", "B", fillOf({ first_name: null, n: 2 }));
recordRb("C named (n=3)", "C", fillOf({ first_name: FIRST, n: 3 }));
recordRb("C no-name (n=3)", "C", fillOf({ first_name: null, n: 3 }));

if (out.filter((x) => x.family === "lifecycle").length !== 7) throw new Error("expected 7 lifecycle templates");
if (out.filter((x) => x.family === "rombot-checkin").length !== 8) throw new Error("expected 8 check-in versions");
for (const r of out) {
  if (r.resend_id) throw new Error("resend id must be null");
  if (r.claimed_email_sends) throw new Error("email_sends must not be claimed");
  const blob = JSON.stringify(r);
  if (/resend\.com|api\.resend/i.test(blob)) throw new Error("resend mentioned in output");
  const addrs = [...(String(r.text ?? "") + "\n" + String(r.html ?? "") + "\n" + String(r.from ?? "") + "\n" + String(r.replyTo ?? "") + "\n" + String(r.to ?? "")).matchAll(/(?:^|[^A-Za-z0-9._%+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)].map((m) => m[1].toLowerCase());
  const bad = addrs.filter((a) => a !== "user@example.com" && a !== "hello@romrx.io");
  if (bad.length) throw new Error("unexpected address: " + [...new Set(bad)].join(","));
}

globalThis.fetch = fetchWas;
await Deno.stdout.write(new TextEncoder().encode(JSON.stringify({
  method: "template functions only: buildEmail, copyFor (via buildEmail), render, renderEmail, buildCheckinEmail, noteContent",
  imported: ["source/email.ts", "source/copy.ts", "source/logic.ts noteContent+APP_PATH only", "_shared/email_footer.ts"],
  not_imported: ["source/handler.ts", "source/index.ts"],
  fetch: "disabled; threw if called",
  resend: "not called; no resend id",
  email_sends: "not written; claimed_email_sends false on every record",
  templates: out,
}, null, 2) + "\n"));
