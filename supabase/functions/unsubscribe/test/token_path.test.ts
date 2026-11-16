import { assert, assertEquals } from "jsr:@std/assert@1";
import { signUnsubToken } from "../_shared/unsub_token.ts";
import { CONFIRM_PAGES, handleTokenRequest, needsRateLimit, ONE_CLICK_BODY, SCOPE_COLUMN } from "../source/token_path.ts";

const U = "11111111-1111-4111-8111-111111111111";
const SECRET = "k".repeat(40);
function run(method: string, q: string, secret: string | undefined, body: string | null | undefined = method === "POST" ? ONE_CLICK_BODY : undefined) {
  const calls: string[] = [];
  const p = handleTokenRequest(new Request(`https://x.test/unsubscribe${q}`, { method, body: body ?? undefined }), {
    secret, apply: (u, s) => { calls.push(`apply:${u}:${s}`); return Promise.resolve(1); }, log: (u, s) => { calls.push(`log:${u}:${s}`); return Promise.resolve(); },
  });
  return { p, calls };
}
Deno.test("no t param falls through to the v8 email path", async () => {
  const r = run("GET", "?email=a@b.co", SECRET);
  assertEquals(await r.p, null);
  assertEquals(r.calls.length, 0);
});
Deno.test("valid token: ONE-CLICK POST applies exactly its own scope", async () => {
  for (const scope of ["retest", "protocol", "digest", "all"] as const) {
    const t = await signUnsubToken(SECRET, U, scope);
    const r = run("POST", `?t=${t}`, SECRET);
    assertEquals(await r.p, { status: 200, body: { ok: true } });
    assertEquals(r.calls, [`apply:${U}:${scope}`, `log:${U}:${scope}`]);
  }
});
Deno.test("GET applies NOTHING for a valid token: redirect to the confirm page only", async () => {
  for (const scope of ["retest", "protocol", "digest", "all"] as const) {
    const t = (await signUnsubToken(SECRET, U, scope))!;
    const r = run("GET", `?t=${t}&b=bjj`, SECRET);
    const res = (await r.p)!;
    assertEquals(res.status, 302);
    assertEquals(res.redirect, `${CONFIRM_PAGES.bjj}?t=${encodeURIComponent(t)}`);
    assertEquals(res.body, undefined);
    assertEquals(r.calls.length, 0);
  }
});
Deno.test("GET gives the same redirect for bad tokens and no secret (reveals nothing) and applies nothing", async () => {
  const good = (await signUnsubToken(SECRET, U, "all"))!;
  for (const [q, secret] of [["?t=junk&b=base", SECRET], [`?t=${good}&b=base`, undefined], [`?t=${good}x&b=base`, SECRET]] as const) {
    const r = run("GET", q, secret);
    const res = (await r.p)!;
    assertEquals(res.status, 302);
    assertEquals(res.redirect!.startsWith(CONFIRM_PAGES.base + "?t="), true);
    assertEquals(r.calls.length, 0);
  }
});
Deno.test("GET redirect goes only to the fixed brand pages; unknown or hostile b falls back to base", async () => {
  const t = (await signUnsubToken(SECRET, U, "digest"))!;
  for (const b of ["evil", "https://evil.test", "__proto__", "constructor", "", "BJJ"]) {
    const res = (await run("GET", `?t=${t}&b=${encodeURIComponent(b)}`, SECRET).p)!;
    assertEquals(res.redirect!.startsWith(CONFIRM_PAGES.base + "?t="), true, b);
  }
  for (const [b, page] of Object.entries(CONFIRM_PAGES)) assertEquals(((await run("GET", `?t=${t}&b=${b}`, SECRET).p)!).redirect!.startsWith(page + "?t="), true);
  for (const page of Object.values(CONFIRM_PAGES)) assertEquals(new URL(page).protocol, "https:");
});
Deno.test("POST without the RFC 8058 body applies nothing (400)", async () => {
  const t = await signUnsubToken(SECRET, U, "all");
  for (const body of [null, "", "List-Unsubscribe=No", "x=1", "List-Unsubscribe=One-Click-Not"]) {
    const r = run("POST", `?t=${t}`, SECRET, body);
    assertEquals((await r.p)!.status, 400);
    assertEquals(r.calls.length, 0);
  }
  // form-encoded with other fields still counts
  const r = run("POST", `?t=${t}`, SECRET, "a=1&List-Unsubscribe=One-Click");
  assertEquals((await r.p)!.status, 200);
  assertEquals(r.calls.length, 2);
});
Deno.test("PUT, DELETE and others are 405", async () => {
  const t = await signUnsubToken(SECRET, U, "all");
  for (const m of ["PUT", "DELETE", "PATCH"]) { const r = run(m, `?t=${t}`, SECRET, "List-Unsubscribe=One-Click"); assertEquals((await r.p)!.status, 405); assertEquals(r.calls.length, 0); }
});
Deno.test("bad, tampered, wrong-secret or unsigned tokens: 400 invalid_token (never ok), nothing applied", async () => {
  const t = (await signUnsubToken(SECRET, U, "digest"))!;
  for (const [q, secret] of [["?t=junk", SECRET], [`?t=${t}x`, SECRET], [`?t=${t}`, "z".repeat(40)], [`?t=${t}`, "short"], ["?t=", SECRET]] as const) {
    const r = run("POST", q, secret);
    assertEquals(await r.p, { status: 400, body: { ok: false, error: "invalid_token" } }, q);
    assertEquals(r.calls.length, 0, q);
  }
});
Deno.test("missing signing secret: 503 unavailable, not ok, nothing applied", async () => {
  const t = (await signUnsubToken(SECRET, U, "digest"))!;
  const r = run("POST", `?t=${t}`, undefined);
  assertEquals(await r.p, { status: 503, body: { ok: false, error: "unavailable" } });
  assertEquals(r.calls.length, 0);
});
Deno.test("a valid token whose write fails is 503 unavailable (no false success); a log failure after a good write is still ok", async () => {
  const t = (await signUnsubToken(SECRET, U, "all"))!;
  const req = () => new Request(`https://x.test/unsubscribe?t=${t}`, { method: "POST", body: ONE_CLICK_BODY });
  assertEquals(await handleTokenRequest(req(), { secret: SECRET, apply: () => Promise.reject(new Error("db down")), log: () => Promise.resolve() }), { status: 503, body: { ok: false, error: "unavailable" } });
  assertEquals(await handleTokenRequest(req(), { secret: SECRET, apply: () => Promise.resolve(1), log: () => Promise.reject(new Error("log down")) }), { status: 200, body: { ok: true } });
  assertEquals(await handleTokenRequest(req(), { secret: SECRET, apply: () => Promise.resolve(0), log: () => Promise.resolve() }), { status: 200, body: { ok: true } }); // zero rows: nothing to switch off, no account state revealed
});
Deno.test("a bad token is still rate limited by IP, a valid one is not", async () => {
  const t = (await signUnsubToken(SECRET, U, "all"))!;
  const mk = (tok: string) => new Request(`https://x.test/unsubscribe?t=${tok}`, { method: "POST", body: ONE_CLICK_BODY });
  assertEquals(await needsRateLimit(mk("junk"), SECRET), true);
  assertEquals(await needsRateLimit(mk(t), SECRET), false);
});
Deno.test("scope to column map never touches another toggle", () => {
  assertEquals(SCOPE_COLUMN, { retest: "retest_reminders", protocol: "email_reminders", digest: "weekly_digest" });
});

const rq = (method: string, q: string, body?: string) => new Request(`https://x.test/unsubscribe${q}`, { method, body });
Deno.test("rate limit: a genuine one-click opt-out is NEVER refused, however many arrive from one IP", async () => {
  let limited = 0;
  for (let i = 0; i < 200; i++) {
    const scope = (["retest", "protocol", "digest", "all"] as const)[i % 4];
    const t = await signUnsubToken(SECRET, U, scope);
    if (await needsRateLimit(rq("POST", `?t=${t}`, ONE_CLICK_BODY).clone(), SECRET)) limited++;
  }
  assertEquals(limited, 0);
});
Deno.test("rate limit: token GET (redirect only) is exempt; bad tokens, wrong body, v8 email path and odd methods stay limited", async () => {
  const good = (await signUnsubToken(SECRET, U, "all"))!;
  assertEquals(await needsRateLimit(rq("GET", `?t=${good}&b=bjj`), SECRET), false);
  assertEquals(await needsRateLimit(rq("POST", "?t=garbage", ONE_CLICK_BODY), SECRET), true);
  assertEquals(await needsRateLimit(rq("POST", `?t=${good}x`, ONE_CLICK_BODY), SECRET), true);
  assertEquals(await needsRateLimit(rq("POST", `?t=${good}`, ONE_CLICK_BODY), "z".repeat(40)), true, "wrong secret");
  assertEquals(await needsRateLimit(rq("POST", `?t=${good}`, ONE_CLICK_BODY), undefined), true, "no secret");
  assertEquals(await needsRateLimit(rq("POST", `?t=${good}`, "nope"), SECRET), true, "valid token but not the one-click body is not exempt");
  assertEquals(await needsRateLimit(rq("POST", "", JSON.stringify({ email: "a@b.co" })), SECRET), true, "v8 email path");
  assertEquals(await needsRateLimit(rq("GET", "?email=a@b.co"), SECRET), true, "v8 email GET");
  assertEquals(await needsRateLimit(rq("PUT", `?t=${good}`, ONE_CLICK_BODY), SECRET), true);
});
Deno.test("rate limit: the 20/hr limiter in index.ts is only reachable through needsRateLimit, and the body stays readable", async () => {
  const src = await Deno.readTextFile(new URL("../source/index.ts", import.meta.url));
  const i = src.indexOf("enforceRateLimit(req"), j = src.indexOf("needsRateLimit(req.clone()");
  assert(j > 0 && i > j, "limiter must come after the needsRateLimit guard");
  assertEquals(src.split("enforceRateLimit(req").length - 1, 1);
  const r = rq("POST", `?t=${(await signUnsubToken(SECRET, U, "digest"))!}`, ONE_CLICK_BODY);
  await needsRateLimit(r.clone(), SECRET);
  assertEquals(await r.text(), ONE_CLICK_BODY);
});
Deno.test("confirm pages are the sites' real React routes (Jules): Base /app/unsubscribe, BJJ and BB /unsubscribe, never a static .html", () => {
  assertEquals(CONFIRM_PAGES, { bjj: "https://romrxbjj.com/unsubscribe", bodybuilding: "https://romrxbodybuilding.com/unsubscribe", base: "https://romrx.io/app/unsubscribe" });
  for (const u of Object.values(CONFIRM_PAGES)) { if (/\.html$/.test(u)) throw new Error("static html confirm page: " + u); }
});
Deno.test("GET redirect target for each brand (and an unknown brand falls back to Base)", async () => {
  const t = (await signUnsubToken(SECRET, U, "all"))!;
  for (const [b, base] of [["base", "https://romrx.io/app/unsubscribe"], ["bjj", "https://romrxbjj.com/unsubscribe"], ["bodybuilding", "https://romrxbodybuilding.com/unsubscribe"], ["evil", "https://romrx.io/app/unsubscribe"]] as const) {
    const res = (await run("GET", `?t=${t}&b=${b}`, SECRET).p)!;
    assertEquals(res.redirect, `${base}?t=${encodeURIComponent(t)}`);
  }
});
