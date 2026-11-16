// Standalone lapsed unsubscribe scope (2026-11-15, BUILD ONLY) on the live v12 token path.
// lapsed maps to the "plan day reminders" setting (email_reminders), which also gates protocol.
// No check7/check14 (not live send kinds). The v12 'all' write and the v8 email path are unchanged.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { SCOPE_SETTING, SCOPES, signUnsubToken, type UnsubScope, verifyUnsubToken } from "../_shared/unsub_token.ts";
import { CONFIRM_PAGES, handleTokenRequest, needsRateLimit, ONE_CLICK_BODY, SCOPE_COLUMN } from "../source/token_path.ts";

const U = "11111111-1111-4111-8111-111111111111";
const SECRET = "k".repeat(40);
const OLD = ["retest", "protocol", "digest", "all"] as const;
function run(method: string, q: string, secret: string | undefined, body: string | undefined = method === "POST" ? ONE_CLICK_BODY : undefined) {
  const calls: string[] = [];
  const p = handleTokenRequest(new Request(`https://x.test/unsubscribe${q}`, { method, body }), {
    secret, apply: (u, s) => { calls.push(`apply:${u}:${s}`); return Promise.resolve(1); }, log: (u, s) => { calls.push(`log:${u}:${s}`); return Promise.resolve(); },
  });
  return { p, calls };
}
const enc = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** Signs ANY payload with the real secret, so a bad scope is rejected by the scope check, not by the signature. */
async function signRaw(payloadObj: unknown): Promise<string> {
  const payload = b64u(enc.encode(JSON.stringify(payloadObj)));
  const k = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${payload}.${b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(payload))))}`;
}

Deno.test("lapsed: a token signs, verifies, and a one-click POST applies exactly the lapsed scope", async () => {
  const t = (await signUnsubToken(SECRET, U, "lapsed"))!;
  assert(t);
  assertEquals(await verifyUnsubToken(SECRET, t), { userId: U, scope: "lapsed" });
  const r = run("POST", `?t=${t}`, SECRET);
  assertEquals(await r.p, { status: 200, body: { ok: true } });
  assertEquals(r.calls, [`apply:${U}:lapsed`, `log:${U}:lapsed`]);
});
Deno.test("lapsed: GET with a lapsed token only redirects to the brand confirm page and applies nothing", async () => {
  const t = (await signUnsubToken(SECRET, U, "lapsed"))!;
  for (const [b, page] of Object.entries(CONFIRM_PAGES)) {
    const r = run("GET", `?t=${t}&b=${b}`, SECRET);
    assertEquals(await r.p, { status: 302, redirect: `${page}?t=${encodeURIComponent(t)}` });
    assertEquals(r.calls.length, 0);
  }
});
Deno.test("lapsed: a genuine lapsed one-click is never rate limited", async () => {
  const t = (await signUnsubToken(SECRET, U, "lapsed"))!;
  assertEquals(await needsRateLimit(new Request(`https://x.test/unsubscribe?t=${t}`, { method: "POST", body: ONE_CLICK_BODY }), SECRET), false);
});
Deno.test("lapsed maps to email_reminders (plan day reminders); the four old scopes and SCOPE_COLUMN are unchanged", () => {
  assertEquals(SCOPE_COLUMN, { retest: "retest_reminders", protocol: "email_reminders", digest: "weekly_digest" });
  const col = (s: Exclude<UnsubScope, "all">) => SCOPE_COLUMN[SCOPE_SETTING[s]];
  assertEquals(Object.fromEntries((["retest", "protocol", "digest", "lapsed"] as const).map((s) => [s, col(s)])), {
    retest: "retest_reminders", protocol: "email_reminders", digest: "weekly_digest", lapsed: "email_reminders",
  });
  assertEquals([...SCOPES], ["retest", "protocol", "digest", "all", "lapsed"]);
});
Deno.test("tampered, unknown or re-scoped tokens are rejected (400 invalid_token, nothing applied)", async () => {
  const good = (await signUnsubToken(SECRET, U, "lapsed"))!;
  const [payload, sig] = good.split(".");
  const swapped = b64u(enc.encode(JSON.stringify({ u: U, s: "all" }))) + "." + sig; // scope swapped, old signature
  const bad: string[] = [
    `${good}x`, `${payload}.${sig.slice(0, -2)}AA`, swapped,
    await signRaw({ u: U, s: "check21" }), await signRaw({ u: U, s: "check7" }), await signRaw({ u: U, s: "check14" }),
    await signRaw({ u: U, s: "LAPSED" }), await signRaw({ u: U, s: "lapsed " }),
    await signRaw({ u: U, s: "__proto__" }), await signRaw({ u: U, s: ["lapsed"] }), await signRaw({ u: U }), await signRaw({ u: "nope", s: "lapsed" }),
  ];
  for (const t of bad) {
    assertEquals(await verifyUnsubToken(SECRET, t), null, t);
    const r = run("POST", `?t=${encodeURIComponent(t)}`, SECRET);
    assertEquals(await r.p, { status: 400, body: { ok: false, error: "invalid_token" } }, t);
    assertEquals(r.calls.length, 0);
  }
  for (const s of ["check21", "check7", "check14", "weekly", "", "ALL"]) assertEquals(await signUnsubToken(SECRET, U, s as UnsubScope), null, s);
  assertEquals(await verifyUnsubToken("z".repeat(40), good), null, "wrong secret");
  assertEquals(await signUnsubToken(undefined, U, "lapsed"), null, "no secret: fail closed");
});
Deno.test("old-scope tokens keep the exact v12 payload format and still verify", async () => {
  for (const scope of OLD) {
    const t = (await signUnsubToken(SECRET, U, scope))!;
    assertEquals(t, await signRaw({ u: U, s: scope }), scope);
    assertEquals(await verifyUnsubToken(SECRET, t), { userId: U, scope });
  }
});
Deno.test("index.ts keeps the v12 'all' write and the v8 email path byte-stable; scoped writes go through SCOPE_SETTING", async () => {
  const src = await Deno.readTextFile(new URL("../source/index.ts", import.meta.url));
  assert(src.includes(`if (scope === "all") {
        const u = await a.from("users").update({ marketing_opt_out: true }).eq("id", userId).select("id");`));
  assert(src.includes(`.update({ retest_reminders: false, email_reminders: false, weekly_digest: false }).eq("user_id", userId).select("id");`));
  assert(src.includes(`.update({ [SCOPE_COLUMN[SCOPE_SETTING[scope]]]: false }).eq("user_id", userId).select("id");`));
  assert(src.includes(`await a.from("users").update({ marketing_opt_out: true }).ilike("email", email).select("id");`));
  assertEquals(src.split(".update(").length - 1, 4, "same four writes as v12 (users all, prefs all, prefs scoped, v8 email path)");
});
