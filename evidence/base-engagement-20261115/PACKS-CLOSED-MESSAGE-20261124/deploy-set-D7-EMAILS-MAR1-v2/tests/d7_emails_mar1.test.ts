// D7-v2 copy tests. BUILD ONLY. No network, no secrets, no deploy.
// Welcome and assessment stay at the v1 line (S9 + Q2/F27 short cancel).
// Lead uses S9 plus the v2 lead cancel line, both verbatim.
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
// v1 published shas; welcome and assessment must stay byte-identical
const V1_WELCOME_SHA =
  "4501ab10af456e0924d689ce71ed6f85e47d7a9fd38d16790e4b674dba00e004";
const V1_ASSESSMENT_SHA =
  "a962a1e29017fb0afa6a44522b263d070c63e62d698b003259a46eb973c656c8";

function read(rel: string): string {
  return Deno.readTextFileSync(join(ROOT, rel));
}

async function sha256File(rel: string): Promise<string> {
  const bytes = await Deno.readFile(join(ROOT, rel));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
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

Deno.test("send-s1-welcome-email is unchanged from v1 (S9 + short cancel; BJJ and BB stay empty)", async () => {
  const src = read("send-s1-welcome-email/source/index.ts");
  const live = read("send-s1-welcome-email/rollback-live-v40/source/index.ts");
  assertEquals(await sha256File("send-s1-welcome-email/source/index.ts"), V1_WELCOME_SHA);
  assertStringIncludes(src, `betaLine: "${NEW_SIGNED_UP}",`);
  assertEquals(src.includes(OLD), false);
  assertEquals(src.includes(CANCEL_LEAD), false);
  assertEquals((src.match(/betaLine: "",/g) || []).length, 2);
  assertEquals((src.match(/betaLine: "/g) || []).length, 3); // bjj, bodybuilding, general
  assertStringIncludes(live, `betaLine: "${OLD}",`);
  const without = (t: string) =>
    t.replace(`betaLine: "${NEW_SIGNED_UP}",`, "").replace(`betaLine: "${OLD}",`, "");
  assertEquals(without(src), without(live));
});

Deno.test("submit-assessment is unchanged from v1 (S9 + short cancel; BJJ and BB stay empty)", async () => {
  const src = read("submit-assessment/functions/submit-assessment/index.ts");
  const live = read("submit-assessment/rollback-live-v50/functions/submit-assessment/index.ts");
  assertEquals(await sha256File("submit-assessment/functions/submit-assessment/index.ts"), V1_ASSESSMENT_SHA);
  assertStringIncludes(src, `betaLine: "${NEW_SIGNED_UP}",`);
  assertEquals(src.includes(OLD), false);
  assertEquals(src.includes(CANCEL_LEAD), false);
  assertEquals((src.match(/betaLine: "",/g) || []).length, 2);
  assertStringIncludes(live, `betaLine: "${OLD}",`);
  const without = (t: string) =>
    t.replace(`betaLine: "${NEW_SIGNED_UP}",`, "").replace(`betaLine: "${OLD}",`, "");
  assertEquals(without(src), without(live));
});

Deno.test("submit-lead-assessment email.ts: S9 + v2 lead cancel only; index.ts unchanged", () => {
  const src = read("submit-lead-assessment/source/email.ts");
  const live = read("submit-lead-assessment/rollback-live-v36/source/email.ts");
  assertStringIncludes(src, NEW_LEAD);
  assertStringIncludes(src, S9);
  assertStringIncludes(src, CANCEL_LEAD);
  assertEquals(src.includes(OLD), false);
  assertEquals(src.includes(CANCEL_SIGNED_UP), false);
  assertEquals(src.includes(NEW_SIGNED_UP), false);
  assertEquals(src.split(NEW_LEAD).length, 2);
  const without = (t: string) => t.replace(NEW_LEAD, "").replace(OLD, "");
  assertEquals(without(src), without(live));
  const idxNew = Deno.readFileSync(join(ROOT, "submit-lead-assessment/source/index.ts"));
  const idxOld = Deno.readFileSync(join(ROOT, "submit-lead-assessment/rollback-live-v36/source/index.ts"));
  assertEquals(idxNew, idxOld);
});

Deno.test("lead renderEmail contains S9, $60, March 1, 2027, and the v2 lead cancel line; no Jan 1 / Dec 31 / free through / v1 short cancel", () => {
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
