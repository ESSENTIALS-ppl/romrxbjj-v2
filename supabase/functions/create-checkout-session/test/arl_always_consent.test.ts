import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  ARL_CONSENT, COACH_DISCLOSURE, ArlConsentUnavailableError, CONSENT_UNAVAILABLE_MESSAGE, CONSENT_UNAVAILABLE_STATUS, createConsentSession,
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
  // Every session (base, unlock, coach) goes through createConsentSession; nothing calls Stripe directly.
  assertEquals((src.match(/createConsentSession\(\(p\) => s\.checkout\.sessions\.create\(p\)/g) ?? []).length, 2);
  assertEquals((src.match(/createConsentSession\(\(p\) => stripe\.checkout\.sessions\.create\(p\), coachParams, COACH_DISCLOSURE/g) ?? []).length, 1);
  assertEquals((src.match(/\.checkout\.sessions\.create\(/g) ?? []).length, 3);
  assertEquals((src.match(/await (s|stripe|stripeTest!?)\.checkout\.sessions\.create\(/g) ?? []).length, 0);
});

Deno.test("index.ts: fail-closed handler returns 503 + logs event", () => {
  assertEquals((src.replace(/^\s*\/\/.*$/gm, "").match(/logEvent\("checkout_arl_consent_unavailable"/g) ?? []).length, 3);
  assertEquals((src.match(/return json\(CONSENT_UNAVAILABLE_STATUS, \{ error: "arl_consent_unavailable"/g) ?? []).length, 3);
  assertEquals(CONSENT_UNAVAILABLE_STATUS, 503);
  assert(!CONSENT_UNAVAILABLE_MESSAGE.includes("\u2014"));
});

Deno.test("coach: consent required and fails closed (paused path)", () => {
  const i = src.indexOf('if (mode === "coach")');
  const coach = src.slice(i, src.indexOf('return json(400, { error: "Invalid mode" })', i));
  assert(coach.includes("createConsentSession("));
  assert(coach.includes('mode: "coach"') && coach.includes("CONSENT_UNAVAILABLE_STATUS"));
  assert(coach.indexOf("COACH_CHECKOUT_OPEN") < coach.indexOf("createConsentSession("));
  assert(!COACH_DISCLOSURE.includes("\u2014"));
});

Deno.test("no email address printed in any log", () => {
  const logs = src.match(/console\.(log|warn|error|info)\([^;]*;/g) ?? [];
  assert(logs.length > 0);
  for (const l of logs) assert(!/email|Email/.test(l.replace(/email mismatch/, "").replace(/redactEmail\(/g, "")), l);
  assert(src.includes("console.warn(`lead ${lead.id}: email mismatch`);"));
});

Deno.test("Stripe error logs print only code, type and message (never the raw object)", () => {
  assert(!/console\.error\("stripe \w+ checkout failed", err\)/.test(src));
  for (const k of ["base", "unlock", "coach"]) {
    assert(src.includes(`console.error("stripe ${k} checkout failed", { code: err.code ?? null, type: err.type ?? null, message: redactEmail(err.message) });`), k);
  }
});

Deno.test("Stripe message is email-redacted before logging", () => {
  assert(src.includes('return (m ?? "").replace(/[^\\s@]+@[^\\s@]+/g, "[email]");'));
  const redactEmail = (m: string | null | undefined) => (m ?? "").replace(/[^\s@]+@[^\s@]+/g, "[email]");
  assertEquals(redactEmail("Invalid email: a.b+c@x.co is bad"), "Invalid email: [email] is bad");
  assertEquals(redactEmail(undefined), "");
  assertEquals(redactEmail("no address"), "no address");
});

Deno.test("Stripe-failure 502s return a generic body with no Stripe text", () => {
  assertEquals((src.match(/return json\(502, \{ error: "checkout_failed" \}\);/g) ?? []).length, 3);
  assert(!/message: err\.message/.test(src));
  assert(!/stripe_type: err\.type/.test(src));
  assert(!src.includes("Stripe checkout session creation failed"));
});

Deno.test("consent-error logs are email-redacted", () => {
  assertEquals((src.match(/console\.error\("ARL consent unavailable; no session created", redactEmail\(e\.message\)\);/g) ?? []).length, 3);
  assert(!/no session created", e\.message\)/.test(src));
});

Deno.test("no client response includes DB or Stripe message text", () => {
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  // Every json(...) response and every claimLead error value
  const responses = code.match(/json\(\s*[\w.]+\s*,[\s\S]*?\)\s*;/g) ?? [];
  assert(responses.length > 10);
  for (const r of responses) assert(!/\.message\b|err\.|e\.message|String\(e/.test(r.replace(/CONSENT_UNAVAILABLE_MESSAGE/g, "")), r);
  const claimErrs = code.match(/error: `[^`]*`/g) ?? [];
  assertEquals(claimErrs.length, 0);
  assert(code.includes('return { ok: false, status: 500, error: "lead_lookup_failed" };'));
  assert(code.includes('console.error("lead lookup failed", redactEmail(leadErr.message));'));
});
