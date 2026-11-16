// P1-17 words test: every user-facing string equals Stacy's final copy byte for byte
// (STACY-P1-17-DAY3-WORDS-20261116-0926.md, sha256 6fd272b6...). The literal block below is her text; when STACY_WORDS_FILE
// points at her file (run: STACY_WORDS_FILE=/workspace/process/evidence/STACY-P1-17-DAY3-WORDS-20261116-0926.md), the test also
// checks the file's sha256 and re-reads every string from the file itself.
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { BRANCH_COPY, EMAIL_OPENER, FOOTER, NO_NAME_OPENER, REMAINING_WORD, render, SUBJECT_NAME_SUFFIX, SUBJECTS } from "../source/copy.ts";

const STACY_SHA256 = "6fd272b642b33c817e51208b7f55567e3acdff338c6ad9cfa3bec6064a1a8ec3";
const STACY = {
  A: ["Hey {first_name}, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your {today_area}. It's short, and you can do it now. Want to start?", "[Start today's session]", "If something got in the way, tell me here and I'll help you find an easier way in."],
  B: ["Nice work, {first_name}. You've done {n} {session/sessions} since your assessment. {remaining} more and you reach your week 1 goal of 3 sessions. Today's focus is your {today_area}.", "[Start today's session]", "Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it."],
  C: ["{first_name}, {n} sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is {next_check_date}. That's when you measure again and see where you are.", "[See my plan]", "If any move doesn't feel right, tell me here."],
} as const;
const STACY_SUBJECTS = { A: "Your plan is ready, {first_name}", B: "{n} done. {remaining} more for your week 1 goal", C: "Strong start, {first_name}" } as const;
const STACY_NO_NAME = { A: "Hey there, ROMBot here.", B: "Nice work.", C: "{n} sessions since your assessment." } as const;

for (const b of ["A", "B", "C"] as const) {
  Deno.test(`branch ${b}: line 1, button and line 3 equal Stacy's final copy byte for byte`, () => {
    assertEquals(BRANCH_COPY[b].line1, STACY[b][0]);
    assertEquals(`[${BRANCH_COPY[b].button}]`, STACY[b][1]);
    assertEquals(BRANCH_COPY[b].line3, STACY[b][2]);
    assertEquals(SUBJECTS[b], STACY_SUBJECTS[b]);
    assertEquals(NO_NAME_OPENER[b].noName, STACY_NO_NAME[b]);
    assert(STACY[b][0].startsWith(NO_NAME_OPENER[b].named), "named opener is the start of Stacy's line");
  });
}
Deno.test("remaining word, email opener and subject no-name rule are Stacy's", () => {
  assertEquals(REMAINING_WORD, { 1: "Two", 2: "One" });
  assertEquals(EMAIL_OPENER, "ROMBot here.");
  assertEquals(SUBJECT_NAME_SUFFIX, ", {first_name}");
});
Deno.test("sign-off is plain ROMBot: no \"Jim's ROMBot\" and no Reid draft words anywhere in the copy", async () => {
  const src = await Deno.readTextFile(new URL("../source/copy.ts", import.meta.url));
  assert(!src.includes("Jim's ROMBot"));
  for (const draft of ["it's Jim's ROMBot", "ready to go", "right now", "One more this week gets you to 3", "feel like a habit", "in your first 3 days", "see what's changed", "{n} down."]) {
    assert(!src.includes(draft), `Reid draft phrase present: ${draft}`);
  }
});
Deno.test("no em dashes, en dashes or spaced hyphens in any user-facing string", () => {
  const all = [...Object.values(BRANCH_COPY).flatMap((c) => [c.line1, c.button, c.line3]), ...Object.values(SUBJECTS), ...Object.values(NO_NAME_OPENER).map((o) => o.noName), EMAIL_OPENER, FOOTER.why, FOOTER.off, FOOTER.allOff, FOOTER.sentTo("user@example.com")];
  for (const s of all) { assert(!/[\u2014\u2013]/.test(s), s); assert(!/ - /.test(s), s); }
});

Deno.test("rendered examples, named and no-name, every branch", () => {
  const A = render("A", { first_name: "Sam", today_area: "hips", n: 0, next_check_date: null });
  assertEquals(A.line1, "Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?");
  assertEquals(A.subject, "Your plan is ready, Sam");
  const A0 = render("A", { first_name: null, today_area: "hips", n: 0, next_check_date: null });
  assertEquals(A0.line1, "Hey there, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?");
  assertEquals(A0.subject, "Your plan is ready");
  const B1 = render("B", { first_name: "Sam", today_area: "shoulders", n: 1, next_check_date: null });
  assertEquals(B1.line1, "Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your shoulders.");
  assertEquals(B1.subject, "1 done. Two more for your week 1 goal");
  const B2 = render("B", { first_name: null, today_area: "neck", n: 2, next_check_date: null });
  assertEquals(B2.line1, "Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your neck.");
  assertEquals(B2.subject, "2 done. One more for your week 1 goal");
  const C = render("C", { first_name: "Sam", today_area: "hips", n: 4, next_check_date: "Monday, Dec 28" });
  assertEquals(C.line1, "Sam, 4 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.");
  assertEquals(C.subject, "Strong start, Sam");
  assertEquals(C.button, "See my plan");
  const C0 = render("C", { first_name: null, today_area: "hips", n: 3, next_check_date: "Monday, Dec 28" });
  assertEquals(C0.line1, "3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.");
  assertEquals(C0.subject, "Strong start");
});
Deno.test("a missing placeholder value throws instead of sending a broken message", () => {
  assertThrows(() => render("C", { first_name: "Sam", today_area: "hips", n: 3, next_check_date: null }));
  assertThrows(() => render("B", { first_name: "Sam", today_area: "hips", n: 3, next_check_date: null }));
});
Deno.test("footer strings are the live lifecycle-emails ones (no new footer words)", async () => {
  const le = await import("../../lifecycle-emails/source/email.ts");
  assertEquals(FOOTER.allOff, le.ALL_OFF_TEXT);
  const lapsed = le.copyFor({ kind: "lapsed", user_id: "u", email: "user@example.com", first_name: "x", active_sport: null, email_id: "x", local_date: "2026-11-16" } as never);
  assertEquals(FOOTER.why, lapsed.why);
  assertEquals(FOOTER.off, lapsed.off);
});

const file = Deno.env.get("STACY_WORDS_FILE");
Deno.test({
  name: "Stacy's file itself: sha256 matches and every string is re-read from it byte for byte",
  ignore: !file,
  fn: async () => {
    const bytes = await Deno.readFile(file!);
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    assertEquals(sha, STACY_SHA256);
    const lines = new TextDecoder().decode(bytes).split("\n");
    const quoted: Record<string, string[]> = {};
    let cur = "";
    for (const l of lines) {
      const m = /^Branch ([ABC]):/.exec(l);
      if (m) { cur = m[1]; quoted[cur] = []; continue; }
      if (cur && l.startsWith("> ")) quoted[cur].push(l.slice(2));
      if (l.startsWith("{remaining} renders")) cur = "";
    }
    for (const b of ["A", "B", "C"] as const) {
      assertEquals(quoted[b], [BRANCH_COPY[b].line1, `[${BRANCH_COPY[b].button}]`, BRANCH_COPY[b].line3]);
      const subj = lines.find((l) => l.startsWith(`- ${b}: "`))!;
      assertEquals(subj, `- ${b}: "${SUBJECTS[b]}"`);
    }
    const nn = lines.find((l) => l.startsWith("No-name fallback:"))!;
    assertEquals(nn, `No-name fallback: Branch A "${NO_NAME_OPENER.A.noName}" Branch B "${NO_NAME_OPENER.B.noName}" Branch C "${NO_NAME_OPENER.C.noName}" Subjects drop "${SUBJECT_NAME_SUFFIX}".`);
    assert(lines.includes(`{remaining} renders as a word: n = 1 gives "${REMAINING_WORD[1]} more", n = 2 gives "${REMAINING_WORD[2]} more".`));
    assert(lines.some((l) => l.startsWith(`Email body opens with "${EMAIL_OPENER}"`)));
  },
});
