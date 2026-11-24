// D7 copy tests. BUILD ONLY. No network, no secrets, no deploy.
// Asserts Stacy S9 + Q2/F27 marketing cancel line, both verbatim, in the three staged files.
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { renderEmail, renderSubject } from "../submit-lead-assessment/source/email.ts";

const ROOT = join(dirname(fromFileUrl(import.meta.url)), "..");
const S9 =
  "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel.";
const CANCEL =
  "Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings";
const NEW = `${S9} ${CANCEL}`;
const OLD =
  "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.";

function read(rel: string): string {
  return Deno.readTextFileSync(join(ROOT, rel));
}

Deno.test("verbatim S9 + cancel how-to are exact", () => {
  assertEquals(
    NEW,
    "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel. Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings",
  );
});

Deno.test("send-s1-welcome-email: Base betaLine only, BJJ and BB stay empty", () => {
  const src = read("send-s1-welcome-email/source/index.ts");
  const live = read("send-s1-welcome-email/rollback-live-v40/source/index.ts");
  assertStringIncludes(src, `betaLine: "${NEW}",`);
  assertEquals(src.includes(OLD), false);
  assertEquals((src.match(/betaLine: "",/g) || []).length, 2);
  assertEquals((src.match(/betaLine: "/g) || []).length, 3); // bjj, bodybuilding, general
  assertStringIncludes(live, `betaLine: "${OLD}",`);
  // only the general betaLine changed
  const without = (t: string) => t.replace(`betaLine: "${NEW}",`, "").replace(`betaLine: "${OLD}",`, "");
  assertEquals(without(src), without(live));
});

Deno.test("submit-assessment: Base betaLine only, BJJ and BB stay empty", () => {
  const src = read("submit-assessment/functions/submit-assessment/index.ts");
  const live = read("submit-assessment/rollback-live-v50/functions/submit-assessment/index.ts");
  assertStringIncludes(src, `betaLine: "${NEW}",`);
  assertEquals(src.includes(OLD), false);
  assertEquals((src.match(/betaLine: "",/g) || []).length, 2);
  assertStringIncludes(live, `betaLine: "${OLD}",`);
  const without = (t: string) => t.replace(`betaLine: "${NEW}",`, "").replace(`betaLine: "${OLD}",`, "");
  assertEquals(without(src), without(live));
});

Deno.test("submit-lead-assessment email.ts: footnote only, index.ts unchanged", () => {
  const src = read("submit-lead-assessment/source/email.ts");
  const live = read("submit-lead-assessment/rollback-live-v36/source/email.ts");
  assertStringIncludes(src, NEW);
  assertEquals(src.includes(OLD), false);
  assertEquals(src.split(NEW).length, 2);
  const without = (t: string) => t.replace(NEW, "").replace(OLD, "");
  assertEquals(without(src), without(live));
  const idxNew = Deno.readFileSync(join(ROOT, "submit-lead-assessment/source/index.ts"));
  const idxOld = Deno.readFileSync(join(ROOT, "submit-lead-assessment/rollback-live-v36/source/index.ts"));
  assertEquals(idxNew, idxOld);
});

Deno.test("lead renderEmail contains S9, $60, March 1, 2027, and the cancel how-to; no Jan 1 / Dec 31 / free through", () => {
  const html = renderEmail(85, 2, "example-unlock-token", "user@example.com", "https://romrx.io");
  assertStringIncludes(html, S9);
  assertStringIncludes(html, CANCEL);
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
