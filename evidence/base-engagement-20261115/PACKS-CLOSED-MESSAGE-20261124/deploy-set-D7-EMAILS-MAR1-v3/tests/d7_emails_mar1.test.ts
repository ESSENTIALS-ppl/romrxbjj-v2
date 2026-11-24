// D7-v3 copy and sender tests. BUILD ONLY. No network, no secrets, no deploy.
// From/Reply-To for Base welcome and assessment match the lead default: ROMRx <hello@romrx.io>, Reply-To hello@romrx.io.
// Lead cancel line and mood_block consent stay as in v2.
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { renderEmail, renderSubject } from "../submit-lead-assessment/source/email.ts";

const ROOT = join(dirname(fromFileUrl(import.meta.url)), "..");
const S9 =
  "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel.";
const CANCEL_SIGNED_UP =
  "Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings";
const CANCEL_LEAD =
  "Once you subscribe, you can cancel online anytime in Settings: https://romrx.io/app/dashboard/settings";
const NEW_SIGNED_UP = `${S9} ${CANCEL_SIGNED_UP}`;
const NEW_LEAD = `${S9} ${CANCEL_LEAD}`;
const OLD =
  "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.";
const FROM_BASE = "ROMRx <hello@romrx.io>";
const REPLY_TO_BASE = "hello@romrx.io";

function read(rel: string): string {
  return Deno.readTextFileSync(join(ROOT, rel));
}

Deno.test("verbatim S9 + signed-up cancel, and S9 + lead cancel, are exact", () => {
  assertEquals(
    NEW_SIGNED_UP,
    "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel. Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings",
  );
  assertEquals(
    NEW_LEAD,
    "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel. Once you subscribe, you can cancel online anytime in Settings: https://romrx.io/app/dashboard/settings",
  );
});

Deno.test("send-s1-welcome-email: Base From is ROMRx <hello@romrx.io> and Reply-To is hello@romrx.io; BJJ and BB from lines unchanged; betaLine is the v2 signed-up line", () => {
  const src = read("send-s1-welcome-email/source/index.ts");
  const live = read("send-s1-welcome-email/rollback-live-v40/source/index.ts");
  assertStringIncludes(src, 'fromName: "ROMRx",');
  assertStringIncludes(src, 'fromEmail: "hello@romrx.io",');
  assertStringIncludes(src, "from: `${b.fromName} <${b.fromEmail}>`,");
  assertStringIncludes(src, "reply_to: b.fromEmail,");
  // general From resolves to the lead pattern
  assertEquals(src.includes('fromName: "ROMRx",') && src.includes('fromEmail: "hello@romrx.io",'), true);
  assertStringIncludes(src, 'fromName: "Jim Scott",'); // BJJ and BB
  assertStringIncludes(src, 'fromEmail: "jim@romrxbjj.com",');
  assertStringIncludes(src, 'fromEmail: "jim@romrxbodybuilding.com",');
  assertEquals((src.match(/fromEmail: "hello@romrx.io",/g) || []).length, 1);
  assertStringIncludes(src, `betaLine: "${NEW_SIGNED_UP}",`);
  assertEquals(src.includes(OLD), false);
  assertEquals((src.match(/betaLine: "",/g) || []).length, 2);
  assertStringIncludes(live, 'fromName: "Jim Scott",');
  assertStringIncludes(live, 'fromEmail: "jim@romrx.io",');
  // live customer send has no reply_to (the internal alert does). v3 adds it on the customer send.
  assertEquals(live.includes("from: `${b.fromName} <${b.fromEmail}>`,\n        to: [email],\n        reply_to: b.fromEmail,"), false);
  assertStringIncludes(src, "from: `${b.fromName} <${b.fromEmail}>`,\n        to: [email],\n        reply_to: b.fromEmail,");
});

Deno.test("submit-assessment: Base From is ROMRx <hello@romrx.io> and Reply-To is hello@romrx.io; BJJ and BB unchanged; betaLine is the v2 signed-up line", () => {
  const src = read("submit-assessment/functions/submit-assessment/index.ts");
  const live = read("submit-assessment/rollback-live-v50/functions/submit-assessment/index.ts");
  assertStringIncludes(src, `from: "${FROM_BASE}",`);
  assertStringIncludes(src, `replyTo: "${REPLY_TO_BASE}",`);
  assertStringIncludes(src, "reply_to: c.replyTo");
  assertStringIncludes(src, 'from: "Jim Scott <jim@romrxbjj.com>",');
  assertStringIncludes(src, 'from: "Jim Scott <jim@romrxbodybuilding.com>",');
  assertEquals((src.match(/from: "ROMRx <hello@romrx.io>",/g) || []).length, 1);
  assertEquals((src.match(/replyTo: "hello@romrx.io",/g) || []).length, 1);
  assertStringIncludes(src, `betaLine: "${NEW_SIGNED_UP}",`);
  assertEquals(src.includes(OLD), false);
  assertStringIncludes(live, 'from: "Jim Scott <jim@romrx.io>",');
  assertStringIncludes(live, 'replyTo: "jim@romrx.io",');
});

Deno.test("submit-lead-assessment already uses From ROMRx <hello@romrx.io>; cancel line is the v2 lead wording; index.ts From default unchanged vs v2/live rollback", () => {
  const src = read("submit-lead-assessment/source/email.ts");
  const idx = read("submit-lead-assessment/source/index.ts");
  const liveIdx = read("submit-lead-assessment/rollback-live-v36/source/index.ts");
  assertStringIncludes(idx, `const RESULTS_FROM = Deno.env.get("RESULTS_FROM_EMAIL") ?? "${FROM_BASE}";`);
  assertStringIncludes(idx, "from: RESULTS_FROM,");
  assertEquals(idx, liveIdx);
  assertStringIncludes(src, NEW_LEAD);
  assertEquals(src.includes(OLD), false);
  assertEquals(src.includes(CANCEL_SIGNED_UP), false);
});

Deno.test("lead renderEmail contains S9, $60, March 1, 2027, and the v2 lead cancel line; no Jan 1 / Dec 31 / free through / short cancel", () => {
  const html = renderEmail(85, 2, "example-unlock-token", "user@example.com", "https://romrx.io");
  assertStringIncludes(html, S9);
  assertStringIncludes(html, CANCEL_LEAD);
  assertEquals(html.includes(CANCEL_SIGNED_UP), false);
  assertStringIncludes(html, "$60");
  assertStringIncludes(html, "March 1, 2027");
  assertEquals(html.includes("December 31, 2026"), false);
  assertEquals(html.includes("January 1, 2027"), false);
  assertEquals(html.toLowerCase().includes("free through"), false);
  assertStringIncludes(html, "user%40example.com");
  const subject = renderSubject(85, 2);
  assertEquals(typeof subject, "string");
  assertEquals(subject.length > 0, true);
});
