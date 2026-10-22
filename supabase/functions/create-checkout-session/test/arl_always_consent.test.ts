import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  ARL_CONSENT, ArlConsentUnavailableError, CONSENT_UNAVAILABLE_MESSAGE, CONSENT_UNAVAILABLE_STATUS, createConsentSession,
} from "../consent_session.ts";

const src = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));
// deno-lint-ignore no-explicit-any
type P = any;

Deno.test("consent always set: consent_collection required + disclosure + consent text", async () => {
  const calls: P[] = [];
  const out = await createConsentSession(async (p: P) => { calls.push(p); return { url: "u" }; }, { mode: "subscription" }, "DISC", "AGREE");
  assertEquals(out, { url: "u" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].consent_collection, { terms_of_service: "required" });
  assertEquals(calls[0].custom_text.submit.message, "**DISC**");
  assertEquals(calls[0].custom_text.terms_of_service_acceptance.message, "AGREE");
  assertEquals(ARL_CONSENT.terms_of_service, "required");
});

for (const v of ["false", "", "true", "FALSE"]) {
  Deno.test(`flag ignored: ARL_LIVE_ENABLED=${JSON.stringify(v)} still sets consent`, async () => {
    Deno.env.set("ARL_LIVE_ENABLED", v);
    let seen: P = null;
    await createConsentSession(async (p: P) => { seen = p; return {}; }, {}, "D", "A");
    assertEquals(seen.consent_collection, { terms_of_service: "required" });
    Deno.env.delete("ARL_LIVE_ENABLED");
  });
}

Deno.test("Stripe consent rejection fails closed: one call, no retry, typed error", async () => {
  let n = 0;
  await assertRejects(
    () => createConsentSession(async () => { n++; throw new Error("You must set a terms of service URL in your public details"); }, {}, "D", "A"),
    ArlConsentUnavailableError,
  );
  assertEquals(n, 1);
});

Deno.test("other Stripe errors propagate unchanged (no retry)", async () => {
  let n = 0;
  await assertRejects(() => createConsentSession(async () => { n++; throw new Error("card_declined"); }, {}, "D", "A"), Error, "card_declined");
  assertEquals(n, 1);
});

Deno.test("index.ts: no ARL_LIVE gate, no no-consent paths, no fallback retry", () => {
  assert(!/ARL_LIVE/.test(src.replace(/^\/\/.*$/gm, "")), "ARL_LIVE referenced in code");
  assert(!src.includes('arl_consent: "unavailable"'), "fallback retry still present");
  assert(!src.includes("v32 (live) behavior"), "legacy no-consent path still present");
  // Every Base/unlock session goes through createConsentSession; only the coach path calls stripe directly.
  assertEquals((src.match(/createConsentSession\(\(p\) => s\.checkout\.sessions\.create\(p\)/g) ?? []).length, 2);
  assertEquals((src.match(/\.checkout\.sessions\.create\(/g) ?? []).length, 3);
  const coachIdx = src.indexOf('if (mode === "coach")');
  assert(src.lastIndexOf("stripe.checkout.sessions.create(") > coachIdx);
});

Deno.test("index.ts: fail-closed handler returns 503 + logs event", () => {
  assertEquals((src.replace(/^\s*\/\/.*$/gm, "").match(/logEvent\("checkout_arl_consent_unavailable"/g) ?? []).length, 2);
  assertEquals((src.match(/return json\(CONSENT_UNAVAILABLE_STATUS, \{ error: "arl_consent_unavailable"/g) ?? []).length, 2);
  assertEquals(CONSENT_UNAVAILABLE_STATUS, 503);
  assert(!CONSENT_UNAVAILABLE_MESSAGE.includes("\u2014"));
});
