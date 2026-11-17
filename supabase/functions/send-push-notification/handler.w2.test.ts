// P1-14 W2 tests for send-push-notification: the legacy notification_preferences fallback is used only when
// no push_subscriptions row for that endpoint belongs to a different user. One planted mutant per new test.
// Run: deno test --no-lock --node-modules-dir=none --allow-read --allow-write handler.w2.test.ts
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import * as H from "./handler.ts";
import type { Candidate, Deps, OwnerRow, PushSub } from "./handler.ts";

const A = "00000000-0000-4000-8000-0000000000aa";
const B = "00000000-0000-4000-8000-0000000000bb";
const EP = "https://example.com/push/device-moved";
const SUB: PushSub = { endpoint: EP, p256dh: "B" + "x".repeat(40), auth: "a".repeat(16) };
const OTHER: PushSub = { endpoint: "https://example.com/push/device-other", p256dh: "B" + "y".repeat(40), auth: "b".repeat(16) };

const SRC = await Deno.readTextFile(new URL("./handler.ts", import.meta.url));
async function load(src: string) {
  const dir = await Deno.makeTempDir({ prefix: "p1-14-w2-send-mutant-" });
  const f = `${dir}/handler.ts`;
  await Deno.writeTextFile(f, src);
  return await import(`file://${f}`) as typeof H;
}
async function mutant(from: string, to: string) {
  assertEquals(SRC.split(from).length - 1, 1, "mutation anchor not unique");
  return await load(SRC.replace(from, to));
}

// ---------- W2-1: refused when another user owns the endpoint ----------
function refusesOtherOwner(m: typeof H): boolean {
  const owners: OwnerRow[] = [{ user_id: B, endpoint: EP }]; // device moved A -> B; A's backup still holds EP
  const v = m.fallbackAllowed(A, EP, owners);
  if (v.ok || v.reason !== m.FALLBACK_OWNED_BY_OTHER_USER) return false;
  const r = m.filterFallbacks([{ userId: A, sub: SUB }, { userId: B, sub: OTHER }], owners);
  return r.allowed.length === 1 && r.allowed[0].userId === B && r.skipped[m.FALLBACK_OWNED_BY_OTHER_USER] === 1 && r.skipped[m.FALLBACK_OWNER_LOOKUP_FAILED] === 0;
}
Deno.test("w2 send: fallback refused when the endpoint has a push_subscriptions row owned by another user (reason code counted)", () => {
  assert(refusesOtherOwner(H));
});
Deno.test("w2 send mutant caught: owner check ignores other users", async () => {
  const m = await mutant("if (o.endpoint === endpoint && o.user_id !== userId) return", "if (false && o.endpoint === endpoint && o.user_id !== userId) return");
  assertFalse(refusesOtherOwner(m), "mutant survived");
});

// ---------- W2-2: same-user fallback still works ----------
function sameUserAllowed(m: typeof H): boolean {
  if (!m.fallbackAllowed(A, EP, []).ok) return false; // legacy-only user, no table row at all
  if (!m.fallbackAllowed(A, EP, [{ user_id: A, endpoint: EP }]).ok) return false; // A's own (e.g. disabled) row
  if (!m.fallbackAllowed(A, EP, [{ user_id: B, endpoint: OTHER.endpoint }]).ok) return false; // B owns a different endpoint
  const r = m.filterFallbacks([{ userId: A, sub: SUB }], [{ user_id: A, endpoint: EP }]);
  return r.allowed.length === 1 && r.skipped[m.FALLBACK_OWNED_BY_OTHER_USER] === 0;
}
Deno.test("w2 send: same-user legacy fallback is still allowed (no row, own row, or another user's different endpoint)", () => {
  assert(sameUserAllowed(H));
});
Deno.test("w2 send mutant caught: any owner row refuses the fallback (same user included)", async () => {
  const m = await mutant("if (o.endpoint === endpoint && o.user_id !== userId) return", "if (o.endpoint === endpoint) return");
  assertFalse(sameUserAllowed(m), "mutant survived");
});

// ---------- W2-3: owner lookup failure fails closed ----------
function lookupFailClosed(m: typeof H): boolean {
  const v = m.fallbackAllowed(A, EP, null);
  if (v.ok || v.reason !== m.FALLBACK_OWNER_LOOKUP_FAILED) return false;
  const r = m.filterFallbacks([{ userId: A, sub: SUB }, { userId: B, sub: OTHER }], null);
  return r.allowed.length === 0 && r.skipped[m.FALLBACK_OWNER_LOOKUP_FAILED] === 2;
}
Deno.test("w2 send: owner lookup failure skips every fallback (fail closed, reason code counted)", () => {
  assert(lookupFailClosed(H));
});
Deno.test("w2 send mutant caught: lookup failure treated as allowed", async () => {
  const m = await mutant("if (!owners) return { ok: false, reason: FALLBACK_OWNER_LOOKUP_FAILED };", "if (!owners) return { ok: true };");
  assertFalse(lookupFailClosed(m), "mutant survived");
});

// ---------- W2-4: 404/410 cleanup on an allowed legacy fallback is unchanged ----------
async function goneCleanup(m: typeof H): Promise<boolean> {
  const { allowed } = m.filterFallbacks([{ userId: A, sub: SUB }], []);
  if (allowed.length !== 1) return false;
  const c: Candidate = { userId: A, subscriptionId: null, kind: "protocol", dedupeKey: "protocol:2026-11-16", localDate: "2026-11-16", sub: allowed[0].sub, timezone: "America/New_York", isTest: false };
  const clears: string[] = [], releases: string[] = [];
  const d: Deps = {
    cronCallerOk: async () => true,
    webPushSend: "on",
    vapidPublicKey: "pub-not-a-real-key",
    vapidPrivateKey: "priv-not-a-real-key",
    vapidSubject: "mailto:hello@romrx.io",
    now: () => new Date("2026-11-16T19:45:00Z"),
    listDue: async () => [c],
    claim: async () => true,
    send: async () => ({ ok: false, gone: true }),
    markSuccess: async () => {},
    markFailure: async () => {},
    clearDead: async (u, id, ep) => { clears.push(`${u}|${id}|${ep}`); },
    releaseClaim: async (u, k) => { releases.push(`${u}:${k}`); },
  } as Deps;
  const r = await m.handle(new Request("https://x/send-push-notification", { method: "POST", headers: { "x-cron-secret": "s".repeat(40) }, body: "{}" }), d);
  const b = await r.json() as Record<string, number>;
  return r.status === 200 && b.cleared === 1 && b.sent === 0 && b.claimed === 0 &&
    clears.length === 1 && clears[0] === `${A}|null|${EP}` && releases.length === 1 && releases[0] === `${A}:protocol:2026-11-16`;
}
Deno.test("w2 send: 410 on an allowed legacy fallback still clears that user's endpoint and releases the claim (unchanged)", async () => {
  assert(await goneCleanup(H));
});
Deno.test("w2 send mutant caught: clearDead loses the endpoint on 404/410", async () => {
  const m = await mutant("          await d.clearDead(c.userId, c.subscriptionId, c.sub.endpoint);\n", "          await d.clearDead(c.userId, c.subscriptionId, \"\");\n");
  assertFalse(await goneCleanup(m), "mutant survived");
});

// ---------- W2-5: index.ts wiring ----------
const IDX = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
function indexWired(src: string): boolean {
  return src.includes('await sb.from("push_subscriptions").select("user_id, endpoint").in("endpoint", endpoints.slice(i, i + 50));') && // any disabled_at counts
    src.includes("owners = ownerErr || !ownerRows ? null : owners.concat(ownerRows as OwnerRow[]);") &&
    src.includes("const { allowed, skipped } = filterFallbacks(fallbacks, owners);") &&
    src.includes("for (const f of allowed) subsByUser.set(f.userId, [{ id: null, sub: f.sub }]);") &&
    !src.includes("if (fallback) subsByUser.set(p.user_id, [{ id: null, sub: fallback }]);") &&
    src.includes('console.log(JSON.stringify({ fn: "send-push-notification", event: "legacy_fallback_skipped", reasons: skipped }));');
}
Deno.test("w2 send source: listDue routes every legacy fallback through filterFallbacks; owner lookup has no disabled_at filter; log is reason counts only", () => {
  assert(indexWired(IDX));
});
Deno.test("w2 send source mutant caught: old unguarded fallback restored", () => {
  const from = "for (const f of allowed) subsByUser.set(f.userId, [{ id: null, sub: f.sub }]);";
  assertEquals(IDX.split(from).length - 1, 1, "mutation anchor not unique");
  assertFalse(indexWired(IDX.replace(from, "for (const f of fallbacks) subsByUser.set(f.userId, [{ id: null, sub: f.sub }]);")), "mutant survived");
});
