// P1-17 email words v3 (Grant 10:00 AM ET Nov 16; Stacy STACY-P1-17-CLIENT-WORDS-20261116-0958.md, sha256 9d8fe291...).
// Email-only changes: A drops the day count; every email's last line says "open ROMBot and tell me"; {today_area} is worked out
// on the send day. The in-app notes are byte-unchanged vs 35b2b00e (ledger L1161).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { BRANCH_COPY, type Branch, EMAIL_COPY, NO_NAME_OPENER, render, renderEmail, SUBJECTS } from "../source/copy.ts";
import { buildCheckinEmail } from "../source/email.ts";
import { AREA_BY_FAMILY, noteContent, plan, planEmails, type Candidate } from "../source/logic.ts";
import { ALL, at, cand } from "./fixtures.ts";

const STACY_EMAIL_SHA256 = "9d8fe2910ea9708ffbc5b6170ef593eb679c64d82d6ace5c67e6a06314f4e801";
// Stacy's file, items 3 and 4, byte for byte.
const STACY_EMAIL = {
  A: ["Hey {first_name}, ROMBot here. Your plan is ready whenever you are. Today's focus is your {today_area}. It's short, and you can do it now. Want to start?", "[Start today's session]", "If something got in the way, open ROMBot and tell me. I'll help you find an easier way in."],
  B_last: "Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.",
  C_last: "If any move doesn't feel right, open ROMBot and tell me.",
  A_no_name: "Hey there, ROMBot here.",
  A_subject: "Your plan is ready, {first_name}",
} as const;
const LINKS = { offKind: "https://romrx.io/app/unsubscribe?t=k", offAll: "https://romrx.io/app/unsubscribe?t=a", oneClick: "https://x.test/u?t=k&b=base" };
const VARIANTS: [Branch, string | null, number, string | null][] = [
  ["A", "Sam", 0, null], ["A", null, 0, null], ["B", "Sam", 1, null], ["B", null, 2, null], ["B", "Sam", 2, null],
  ["C", "Sam", 4, "Friday, Nov 20"], ["C", null, 3, "Monday, Dec 28"], ["C", "Sam", 12, "Monday, Dec 28"],
];
const AREAS = Object.values(AREA_BY_FAMILY);
function allEmails() {
  const out: { b: Branch; text: string; html: string; subject: string }[] = [];
  for (const [b, first_name, n, next_check_date] of VARIANTS) for (const today_area of AREAS) {
    const e = buildCheckinEmail(renderEmail(b, { first_name, today_area, n, next_check_date }), "user@example.com", LINKS, "P");
    out.push({ b, text: e.text, html: e.html, subject: e.subject });
  }
  return out;
}

Deno.test("email words equal Stacy's 9d8fe291 items 3 and 4 byte for byte; B and C change ONLY the last line", () => {
  assertEquals([EMAIL_COPY.A.line1, `[${EMAIL_COPY.A.button}]`, EMAIL_COPY.A.line3], [...STACY_EMAIL.A]);
  assertEquals(EMAIL_COPY.B.line3, STACY_EMAIL.B_last);
  assertEquals(EMAIL_COPY.C.line3, STACY_EMAIL.C_last);
  assertEquals(NO_NAME_OPENER.A.noName, STACY_EMAIL.A_no_name);
  assertEquals(SUBJECTS.A, STACY_EMAIL.A_subject);
  for (const b of ["B", "C"] as const) {
    assertEquals([EMAIL_COPY[b].line1, EMAIL_COPY[b].button], [BRANCH_COPY[b].line1, BRANCH_COPY[b].button], b);
    assert(EMAIL_COPY[b].line3 !== BRANCH_COPY[b].line3, b);
  }
  assertEquals(renderEmail("A", { first_name: null, today_area: "hips", n: 0, next_check_date: null }).subject, "Your plan is ready");
});

const DAY_COUNT = /\d+\s*-?\s*days?\b|\bdays?\s*\d+|\b(?:one|two|three|four|five|six|seven|a few|several)\s+days?\b|It's been/i;
Deno.test("no day count in any email: no \"3 days\", no digit+day phrasing (text, html, subject; every branch, name, n and area)", () => {
  const all = allEmails();
  assert(all.length >= 30);
  for (const e of all) for (const s of [e.text, e.html, e.subject]) assert(!DAY_COUNT.test(s), `${e.b}: ${DAY_COUNT.exec(s)?.[0]}`);
  // the regex itself catches the old wording
  assert(DAY_COUNT.test(BRANCH_COPY.A.line1));
});
Deno.test("no \"tell me here\" in any email; every email's last line says \"open ROMBot and tell me\" (Open at sentence start)", () => {
  for (const e of allEmails()) {
    assert(!/tell me here/i.test(e.text + e.html + e.subject), e.b);
    assert(/open ROMBot and tell me/i.test(e.text) && /open ROMBot and tell me/i.test(e.html), e.b);
  }
});
Deno.test("Branch A email still says \"ROMBot here.\" exactly once; B and C keep the 6fd272b6 email opener", () => {
  for (const e of allEmails()) {
    assertEquals([e.text.split("ROMBot here.").length - 1, e.html.split("ROMBot here.").length - 1], [1, 1], e.b);
    if (e.b === "A") assert(/^Hey (Sam|there), ROMBot here\. Your plan is ready whenever you are\./.test(e.text));
    else assert(e.text.startsWith("ROMBot here.\n\n"), e.b);
  }
});

// noteContent + button for every variant, captured by running 35b2b00e's own copy.ts/logic.ts (git archive 35b2b00e).
const NOTES_35B2B00E: [Branch, string | null, number, string | null, string, string][] = [
  ["A", "Sam", 0, null, "Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?\nIf something got in the way, tell me here and I'll help you find an easier way in.", "Start today's session"],
  ["A", null, 0, null, "Hey there, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?\nIf something got in the way, tell me here and I'll help you find an easier way in.", "Start today's session"],
  ["B", "Sam", 1, null, "Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.\nAnything feel too easy or too hard? Tell me and I'll help you adjust how you do it.", "Start today's session"],
  ["B", null, 2, null, "Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.\nAnything feel too easy or too hard? Tell me and I'll help you adjust how you do it.", "Start today's session"],
  ["C", "Sam", 4, "Friday, Nov 20", "Sam, 4 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Friday, Nov 20. That's when you measure again and see where you are.\nIf any move doesn't feel right, tell me here.", "See my plan"],
  ["C", null, 3, "Friday, Nov 20", "3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Friday, Nov 20. That's when you measure again and see where you are.\nIf any move doesn't feel right, tell me here.", "See my plan"]
];
Deno.test("in-app notes: all three branches (named and no-name) are byte-unchanged vs 35b2b00e, and keep \"tell me here\" wording", () => {
  for (const [b, first_name, n, next_check_date, content, button] of NOTES_35B2B00E) {
    const r = render(b, { first_name, today_area: "hips", n, next_check_date });
    assertEquals(noteContent(r), content, `${b} ${first_name}`);
    assertEquals(r.button, button);
  }
  // and through the planner: the note phase uses note words, never EMAIL_COPY
  const d = plan(at("2026-11-16T12:30:00Z"), [cand()], ALL).due[0];
  assertEquals(noteContent(d.rendered), NOTES_35B2B00E[0][4]);
});

Deno.test("{today_area} is worked out on the send day: the area changes between note and email, and the email uses the new one", () => {
  // Note Mon Nov 16 7:30 AM ET: ROTATION[1] = 0 -> hip_ir -> hips.
  const note = plan(at("2026-11-16T12:30:00Z"), [cand()], ALL).due[0];
  assert(note.rendered.line1.includes("Today's focus is your hips."));
  const noted = (over: Partial<Candidate> = {}) => cand({ note: { assessment_id: note.assessment_id, branch: note.branch, at: "2026-11-16T12:30:05Z" }, email_already: false, last_session_at: null, last_any_assessment_at: "2026-11-13T14:00:00Z", ...over });
  // Email Tue Nov 17 8:30 AM ET: ROTATION[2] = 1 -> shoulder_flex -> shoulders.
  const tue = planEmails(at("2026-11-17T13:30:00Z"), [noted()], ALL).due[0];
  assert(tue.rendered.line1.includes("Today's focus is your shoulders."));
  assert(!tue.rendered.line1.includes("hips"));
  // Email Wed Nov 18 8:30 AM ET: ROTATION[3] = 2 -> cervical_rot -> neck.
  const wed = planEmails(at("2026-11-18T13:30:00Z"), [noted()], ALL).due[0];
  assert(wed.rendered.line1.includes("Today's focus is your neck."));
  // Email Thu Nov 19 8:30 AM ET (72 h cap not reached, 72h - 4 s): ROTATION[4] = 0 -> hips.
  const thu = planEmails(at("2026-11-19T12:30:01Z"), [noted()], ALL).due[0];
  assert(thu.rendered.line1.includes("Today's focus is your hips."));
  // and the email uses the email words
  assertEquals(tue.rendered.line3, EMAIL_COPY.A.line3);
});
Deno.test("area allowlist still holds in every rendered email and note", () => {
  const allow = new Set(["hips", "shoulders", "neck", "ankles"]);
  for (const e of allEmails()) {
    const m = /Today's focus is your ([^.]+)\./.exec(e.text);
    if (m) assert(allow.has(m[1]), m[1]);
  }
  for (const k of [["hip_ir"], ["shoulder_er"], ["cervical_lat"], ["ankle_df"]]) for (const day of ["17", "18", "19", "20", "21", "22", "23"]) {
    const r = planEmails(at(`2026-11-${day}T13:30:00Z`), [cand({ ranked_joint_keys: k, note: { assessment_id: "aaaaaaaa-0000-4000-8000-000000000001", branch: "A", at: `2026-11-${String(Number(day) - 1).padStart(2, "0")}T12:30:05Z` }, last_any_assessment_at: "2026-11-13T14:00:00Z" })], ALL).due[0];
    if (r) assert(allow.has(/Today's focus is your ([^.]+)\./.exec(r.rendered.line1)![1]));
  }
});

const file = Deno.env.get("STACY_EMAIL_WORDS_FILE");
Deno.test({
  name: "Stacy's 9d8fe291 file itself: sha256 matches and items 3 and 4 are re-read from it byte for byte",
  ignore: !file,
  fn: async () => {
    const bytes = await Deno.readFile(file!);
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    assertEquals(sha, STACY_EMAIL_SHA256);
    const lines = new TextDecoder().decode(bytes).split("\n");
    const i = lines.findIndex((l) => l.startsWith("3. Branch A email body"));
    assert(i > 0);
    assertEquals(lines.slice(i + 1, i + 4), [`> ${EMAIL_COPY.A.line1}`, `> [${EMAIL_COPY.A.button}]`, `> ${EMAIL_COPY.A.line3}`]);
    assert(lines.includes(`No-name fallback: "${NO_NAME_OPENER.A.noName}" Subject A stays "${SUBJECTS.A}" (no name: "Your plan is ready").`));
    assert(lines.includes(`- Branch B email: "${EMAIL_COPY.B.line3}"`));
    assert(lines.includes(`- Branch C email: "${EMAIL_COPY.C.line3}"`));
    assert(lines.includes("The in-app notes keep \"tell me here\"."));
    assert(lines.includes("Note: {today_area} must be worked out on the day the email sends, not copied from the day 3 note."));
  },
});
