import { assert, assertEquals } from "jsr:@std/assert@1";
const src = Deno.readTextFileSync(new URL("../index.ts", import.meta.url));
const code = src.replace(/^\s*\/\/.*$/gm, "");

Deno.test("no client response carries err.message, Stripe or DB text", () => {
  const responses = code.match(/return json\([\s\S]*?\);/g) ?? [];
  assert(responses.length >= 9, String(responses.length));
  for (const r of responses) {
    assert(!/\.message|session\.error|sub\?*\.error|\.error\?\./.test(r), r);
    assert(!/`/.test(r), "dynamic text in response: " + r);
  }
});
Deno.test("both Stripe failures return billing_failed 500", () => {
  assertEquals((code.match(/return json\(\{ error: "billing_failed" \}, 500\);/g) ?? []).length, 2);
  assert(!code.includes('"Stripe error"'));
});
Deno.test("404 bodies unchanged (static)", () => {
  assert(code.includes('return json({ error: "No active subscription to cancel." }, 404);'));
  assert(code.includes('return json({ error: "No subscription found. Contact support at hello@romrx.io" }, 404);'));
});
Deno.test("logs carry only code, type and redacted message", () => {
  const logs = code.match(/console\.error\([^;]*;/g) ?? [];
  for (const l of logs) assert(!/\.error\?*\.message\)|\.message\);/.test(l.replace(/redactEmail\([^)]*\)/g, "")), l);
  const redact = (m: string | null | undefined) => (m ?? "").replace(/[^\s@]+@[^\s@]+/g, "[email]");
  assertEquals(redact("No such customer for a@b.co"), "No such customer for [email]");
});
