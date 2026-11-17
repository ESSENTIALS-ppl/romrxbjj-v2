// P1-17 day 3 ROMBot check-in: user-facing words. EVERY string below is Stacy's final copy, byte for byte:
// /workspace/process/evidence/STACY-P1-17-DAY3-WORDS-20261116-0926.md (sha256 6fd272b642b33c817e51208b7f55567e3acdff338c6ad9cfa3bec6064a1a8ec3),
// "Final copy", "No-name fallback" and "Email subjects". Covered by L1031 via ledger L1036(c). Sign-off is plain "ROMBot".
// Placeholders keep Stacy's spelling: {first_name} {today_area} {n} {session/sessions} {remaining} {next_check_date}.
// The words test (test/words.test.ts) pins every string here against her file. Do not edit without a new Stacy file.
// EMAIL_COPY (email-only words) is Stacy's addendum, byte for byte: /workspace/process/evidence/STACY-P1-17-CLIENT-WORDS-20261116-0958.md
// (sha256 9d8fe2910ea9708ffbc5b6170ef593eb679c64d82d6ace5c67e6a06314f4e801), items 3 and 4 (Grant 10:00 AM ET Nov 16). Where that
// file is silent (B and C first lines and buttons, B and C subjects, the B/C "ROMBot here." email opener), the 6fd272b6 words stay.
// The only other user-facing words this function sends are the shared lifecycle footer strings (FOOTER below), reused
// verbatim from lifecycle-emails live v3 (Stacy P1-16 e1e0a602 lines; ALL_OFF_TEXT; POSTAL_LINE). No new footer words.

export type Branch = "A" | "B" | "C";

/** Stacy "Final copy": [first line, button label, last line] per branch. The button label is shown without Stacy's [brackets]. */
export const BRANCH_COPY: Readonly<Record<Branch, { line1: string; button: string; line3: string }>> = {
  A: {
    line1: "Hey {first_name}, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your {today_area}. It's short, and you can do it now. Want to start?",
    button: "Start today's session",
    line3: "If something got in the way, tell me here and I'll help you find an easier way in.",
  },
  B: {
    line1: "Nice work, {first_name}. You've done {n} {session/sessions} since your assessment. {remaining} more and you reach your week 1 goal of 3 sessions. Today's focus is your {today_area}.",
    button: "Start today's session",
    line3: "Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.",
  },
  C: {
    line1: "{first_name}, {n} sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is {next_check_date}. That's when you measure again and see where you are.",
    button: "See my plan",
    line3: "If any move doesn't feel right, tell me here.",
  },
};

/** Email-only words (Stacy 9d8fe291, items 3 and 4). A: her whole email body (no day count). B and C: ONLY the last line
 *  changes (an email reply goes to the hello@ inbox, not ROMBot); their first line and button stay BRANCH_COPY (6fd272b6).
 *  The in-app notes keep BRANCH_COPY ("tell me here"). */
export const EMAIL_COPY: Readonly<Record<Branch, { line1: string; button: string; line3: string }>> = {
  A: {
    line1: "Hey {first_name}, ROMBot here. Your plan is ready whenever you are. Today's focus is your {today_area}. It's short, and you can do it now. Want to start?",
    button: "Start today's session",
    line3: "If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.",
  },
  B: {
    line1: BRANCH_COPY.B.line1,
    button: BRANCH_COPY.B.button,
    line3: "Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.",
  },
  C: {
    line1: BRANCH_COPY.C.line1,
    button: BRANCH_COPY.C.button,
    line3: "If any move doesn't feel right, open ROMBot and tell me.",
  },
};

/** Stacy "No-name fallback": the named opener (left) is replaced by her no-name opener (right). */
export const NO_NAME_OPENER: Readonly<Record<Branch, { named: string; noName: string }>> = {
  A: { named: "Hey {first_name}, ROMBot here.", noName: "Hey there, ROMBot here." },
  B: { named: "Nice work, {first_name}.", noName: "Nice work." },
  C: { named: "{first_name}, {n} sessions since your assessment.", noName: "{n} sessions since your assessment." },
};

/** Stacy "Email subjects". No-name: "Subjects drop ", {first_name}"." */
export const SUBJECTS: Readonly<Record<Branch, string>> = {
  A: "Your plan is ready, {first_name}",
  B: "{n} done. {remaining} more for your week 1 goal",
  C: "Strong start, {first_name}",
};
export const SUBJECT_NAME_SUFFIX = ", {first_name}";

/** Stacy: "{remaining} renders as a word: n = 1 gives "Two more", n = 2 gives "One more"." */
export const REMAINING_WORD: Readonly<Record<1 | 2, string>> = { 1: "Two", 2: "One" };

/** Stacy: "Email body opens with "ROMBot here."" Stacy Nov 16 answer: Branch B and C only; A already says it in its first line. */
export const EMAIL_OPENER = "ROMBot here.";

/** Shared lifecycle footer, reused verbatim from lifecycle-emails live v3 (copyFor lapsed + ALL_OFF_TEXT). Plan day reminders is
 *  the P1-01 toggle (email_reminders) this email depends on, so its existing Stacy P1-16 lines are the ones that apply. */
export const FOOTER = {
  why: "You're getting this because Plan day reminders is on in your ROMRx settings.",
  off: "Turn off plan day reminders",
  allOff: "Turn off all ROMRx emails except account and billing notices",
  sentTo: (email: string) => `This message was sent to ${email}.`,
} as const;

export interface Fill {
  first_name: string | null;
  today_area: string;
  n: number;
  next_check_date: string | null;
}

function sessionWord(n: number): string { return n === 1 ? "session" : "sessions"; }

/** Fill one template. Throws if a placeholder it needs is missing, so a broken message is never sent. */
export function fill(t: string, f: Fill): string {
  let out = t;
  if (out.includes("{first_name}")) {
    if (!f.first_name) throw new Error("first_name required");
    out = out.split("{first_name}").join(f.first_name);
  }
  if (out.includes("{remaining}")) {
    if (f.n !== 1 && f.n !== 2) throw new Error("remaining needs n 1 or 2");
    out = out.split("{remaining}").join(REMAINING_WORD[f.n]);
  }
  if (out.includes("{next_check_date}")) {
    if (!f.next_check_date) throw new Error("next_check_date required");
    out = out.split("{next_check_date}").join(f.next_check_date);
  }
  out = out.split("{session/sessions}").join(sessionWord(f.n));
  out = out.split("{today_area}").join(f.today_area);
  out = out.split("{n}").join(String(f.n));
  if (/[{}]/.test(out)) throw new Error("unfilled placeholder");
  return out;
}

export interface Rendered { branch: Branch; line1: string; button: string; line3: string; subject: string; }
/** In-app note words (BRANCH_COPY). */
export function render(branch: Branch, f: Fill): Rendered { return renderWith(BRANCH_COPY, branch, f); }
/** Email words (EMAIL_COPY). Same no-name opener and subject rules; Stacy 9d8fe291 item 3 keeps A's no-name opener and subject. */
export function renderEmail(branch: Branch, f: Fill): Rendered { return renderWith(EMAIL_COPY, branch, f); }
function renderWith(table: typeof BRANCH_COPY, branch: Branch, f: Fill): Rendered {
  const c = table[branch];
  let line1 = c.line1;
  let subject = SUBJECTS[branch];
  if (!f.first_name) {
    const o = NO_NAME_OPENER[branch];
    if (!line1.startsWith(o.named)) throw new Error("opener mismatch");
    line1 = o.noName + line1.slice(o.named.length);
    subject = subject.split(SUBJECT_NAME_SUFFIX).join("");
  }
  return { branch, line1: fill(line1, f), button: c.button, line3: fill(c.line3, f), subject: fill(subject, f) };
}
