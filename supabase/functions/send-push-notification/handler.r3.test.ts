// P1-14 r3 tests: protocol reminder exempt from quiet hours; 404/410 cleanup; dry-run would_clear; planted mutants.
// Run: deno test --no-lock --node-modules-dir=none --allow-read --allow-write handler.r3.test.ts
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import * as H from "./handler.ts";
import { handle, inQuietHours, isUserChosenProtocol, skippedByQuietHours, type Candidate, type Deps, type PushSub } from "./handler.ts";

const SUB: PushSub = { endpoint: "https://example.com/push/device-1", p256dh: "B" + "x".repeat(40), auth: "a".repeat(16) };
const SUB2: PushSub = { endpoint: "https://example.com/push/device-2", p256dh: "B" + "y".repeat(40), auth: "b".repeat(16) };
const NY = "America/New_York";
const at = (iso: string) => new Date(iso);

function cand(over: Partial<Candidate> = {}): Candidate {
  return { userId: "00000000-0000-4000-8000-0000000000aa", subscriptionId: "sub-1", kind: "protocol", dedupeKey: "protocol:2026-11-16", localDate: "2026-11-16", sub: SUB, timezone: NY, isTest: false, ...over };
}

type Spy = Deps & { sends: string[]; claims: string[]; clears: string[]; releases: string[]; failures: number };
function deps(mod: typeof H, over: Partial<Deps> = {}): Spy {
  const sends: string[] = [];
  const claims: string[] = [];
  const clears: string[] = [];
  const releases: string[] = [];
  const held = new Set<string>();
  let failures = 0;
  return {
    cronCallerOk: async () => true,
    webPushSend: "on",
    vapidPublicKey: "pub-not-a-real-key",
    vapidPrivateKey: "priv-not-a-real-key",
    vapidSubject: "mailto:hello@romrx.io",
    now: () => new Date("2026-11-16T19:45:00Z"), // 2:45 PM ET
    listDue: async () => [cand()],
    claim: async (u, k) => {
      const key = `${u}:${k}`;
      claims.push(key);
      if (held.has(key)) return false;
      held.add(key);
      return true;
    },
    send: async (_s, payload) => { sends.push(payload); return { ok: true }; },
    markSuccess: async () => {},
    markFailure: async () => { failures += 1; },
    clearDead: async (u, id, ep) => { clears.push(`${u}|${id}|${ep}`); },
    releaseClaim: async (u, k) => { const key = `${u}:${k}`; releases.push(key); held.delete(key); },
    ...over,
    sends,
    claims,
    clears,
    releases,
    get failures() { return failures; },
  } as Spy;
}
const post = () => new Request("https://x/send-push-notification", { method: "POST", headers: { "x-cron-secret": "s".repeat(40) }, body: "{}" });
async function run(mod: typeof H, over: Partial<Deps> = {}) {
  const d = deps(mod, over);
  const r = await mod.handle(post(), d);
  return { d, status: r.status, body: await r.json() as Record<string, number | boolean | string> };
}

Deno.test("r3 quiet helpers: protocol is the user-chosen kind and is never skipped by quiet hours", () => {
  assertEquals(isUserChosenProtocol("protocol"), true);
  assertEquals(isUserChosenProtocol("retest"), false);
  assertEquals(isUserChosenProtocol("digest"), false);
  assertEquals(isUserChosenProtocol("test"), false);
  const quiet = at("2026-11-17T02:30:00Z"); // 21:30 EST
  assert(inQuietHours(quiet, NY));
  assertFalse(skippedByQuietHours("protocol", quiet, NY));
  assert(skippedByQuietHours("retest", quiet, NY));
  assert(skippedByQuietHours("digest", quiet, NY));
  assert(skippedByQuietHours("test", quiet, NY));
  const day = at("2026-11-16T19:45:00Z"); // 14:45 EST
  assertFalse(skippedByQuietHours("retest", day, NY));
});

Deno.test("r3 quiet: a 9:30 PM protocol reminder is sent (user-chosen time is exempt)", async () => {
  // 2026-11-17 02:30Z = 21:30 EST
  const r = await run(H, { now: () => at("2026-11-17T02:30:00Z"), listDue: async () => [cand({ kind: "protocol" })] });
  assertEquals([r.d.sends.length, r.d.claims.length, r.body.skipped_quiet, r.body.sent, r.body.claimed], [1, 1, 0, 1, 1]);
});

Deno.test("r3 quiet: protocol is sent at 21:00, 00:30, and 07:59 local; system nudges at those times are skipped", async () => {
  const times = [
    at("2026-11-17T02:00:00Z"), // 21:00 EST
    at("2026-11-17T05:30:00Z"), // 00:30 EST
    at("2026-11-17T12:59:00Z"), // 07:59 EST
  ];
  for (const now of times) {
    const proto = await run(H, { now: () => now, listDue: async () => [cand({ kind: "protocol" })] });
    assertEquals([proto.body.sent, proto.body.skipped_quiet], [1, 0], `protocol should send at ${now.toISOString()}`);
    for (const kind of ["retest", "digest", "test"] as const) {
      const s = await run(H, { now: () => now, listDue: async () => [cand({ kind, dedupeKey: `${kind}:2026-11-16` })] });
      assertEquals([s.body.sent, s.body.skipped_quiet, s.d.sends.length, s.d.claims.length], [0, 1, 0, 0], `${kind} should skip at ${now.toISOString()}`);
    }
  }
});

Deno.test("r3 quiet: system nudge at 08:00 local is sent", async () => {
  const r = await run(H, { now: () => at("2026-11-17T13:00:00Z"), listDue: async () => [cand({ kind: "retest", dedupeKey: "retest:2026-11-16" })] });
  assertEquals([r.body.sent, r.body.skipped_quiet], [1, 0]);
});

Deno.test("r3 gone: 404 clears only that user's subscription, releases the claim, and is not counted as the day's send or as failed", async () => {
  const r = await run(H, {
    send: async () => ({ ok: false, gone: true }),
  });
  assertEquals(r.body.sent, 0);
  assertEquals(r.body.failed, 0);
  assertEquals(r.body.cleared, 1);
  assertEquals(r.body.claimed, 0);
  assertEquals(r.body.would_clear, 0);
  assertEquals(r.d.clears, ["00000000-0000-4000-8000-0000000000aa|sub-1|https://example.com/push/device-1"]);
  assertEquals(r.d.releases.length, 1);
  assertEquals(r.d.failures, 0);
});

Deno.test("r3 gone: 410 on a legacy jsonb candidate (no table row id) still clears and does not count as the day's send", async () => {
  const r = await run(H, {
    listDue: async () => [cand({ subscriptionId: null })],
    send: async () => ({ ok: false, gone: true }),
  });
  assertEquals([r.body.cleared, r.body.failed, r.body.sent, r.body.claimed], [1, 0, 0, 0]);
  assertEquals(r.d.clears, ["00000000-0000-4000-8000-0000000000aa|null|https://example.com/push/device-1"]);
  assertEquals(r.d.releases.length, 1);
});

Deno.test("r3 gone: a dead first device does not burn the day for a second live device of the same user", async () => {
  const r = await run(H, {
    listDue: async () => [
      cand({ subscriptionId: "dead-sub", sub: SUB, dedupeKey: "protocol:2026-11-16" }),
      cand({ subscriptionId: "live-sub", sub: SUB2, dedupeKey: "protocol:2026-11-16" }),
    ],
    send: async (sub) => sub.endpoint === SUB.endpoint ? { ok: false, gone: true } : { ok: true },
  });
  assertEquals(r.body.cleared, 1);
  assertEquals(r.body.sent, 1);
  assertEquals(r.body.failed, 0);
  assertEquals(r.body.claimed, 1);
  assertEquals(r.body.skipped, 0);
  assertEquals(r.d.clears, ["00000000-0000-4000-8000-0000000000aa|dead-sub|https://example.com/push/device-1"]);
  assertEquals(r.d.releases.length, 1);
});

Deno.test("r3 gone: a non-gone failure still counts as failed, keeps the claim, and does not clear", async () => {
  const r = await run(H, { send: async () => ({ ok: false }) });
  assertEquals([r.body.failed, r.body.cleared, r.body.claimed, r.body.sent, r.d.clears.length, r.d.releases.length, r.d.failures], [1, 0, 1, 0, 0, 0, 1]);
});

Deno.test("r3 dry-run: would_clear is reported, no clear write, no claim, no send, no network", async () => {
  const realFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (() => { fetches += 1; throw new Error("network in dry-run"); }) as typeof fetch;
  try {
    for (const flag of [undefined, "", "ON", "true", "1"]) {
      const r = await run(H, { webPushSend: flag });
      assertEquals(r.body.dry_run, true);
      assertEquals(r.body.would_clear, 0); // dry-run does not call send, so it cannot see a 404/410
      assertEquals(r.body.cleared, 0);
      assertEquals(r.body.sent, 0);
      assertEquals(r.body.claimed, 0);
      assertEquals([r.d.sends.length, r.d.claims.length, r.d.clears.length, r.d.releases.length], [0, 0, 0, 0]);
    }
    assertEquals(fetches, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

Deno.test("r3 response: counts only, no endpoints or user ids", async () => {
  const r = await run(H, { send: async () => ({ ok: false, gone: true }) });
  const text = JSON.stringify(r.body);
  assertFalse(text.includes("example.com"));
  assertFalse(text.includes("00000000"));
  assertFalse(text.includes("sub-1"));
  assertEquals("cleared" in r.body, true);
  assertEquals("would_clear" in r.body, true);
});

// ---------- planted mutants ----------
const SRC = await Deno.readTextFile(new URL("handler.ts", import.meta.url));
async function load(src: string): Promise<typeof H> {
  const dir = await Deno.makeTempDir({ prefix: "p1-14-r3-mutant-" });
  const f = `${dir}/handler.ts`;
  await Deno.writeTextFile(f, src);
  return await import(`file://${f}`) as typeof H;
}

async function r3Ok(m: typeof H): Promise<boolean> {
  const quiet = at("2026-11-17T02:30:00Z"); // 21:30 EST
  const proto = await run(m, { now: () => quiet, listDue: async () => [cand({ kind: "protocol" })] });
  if (proto.d.sends.length !== 1 || proto.body.skipped_quiet !== 0) return false;
  const retest = await run(m, { now: () => quiet, listDue: async () => [cand({ kind: "retest", dedupeKey: "retest:2026-11-16" })] });
  if (retest.d.sends.length !== 0 || retest.body.skipped_quiet !== 1) return false;
  const gone = await run(m, { send: async () => ({ ok: false, gone: true }) });
  if (gone.body.cleared !== 1 || gone.body.failed !== 0 || gone.body.sent !== 0 || gone.body.claimed !== 0) return false;
  if (gone.d.clears.length !== 1 || gone.d.releases.length !== 1 || gone.d.failures !== 0) return false;
  // second device after a 410 still sends
  const two = await run(m, {
    listDue: async () => [
      cand({ subscriptionId: "dead-sub", sub: SUB }),
      cand({ subscriptionId: "live-sub", sub: SUB2 }),
    ],
    send: async (sub) => sub.endpoint === SUB.endpoint ? { ok: false, gone: true } : { ok: true },
  });
  if (two.body.sent !== 1 || two.body.cleared !== 1 || two.body.claimed !== 1) return false;
  const dry = await run(m, { webPushSend: undefined, send: async () => ({ ok: false, gone: true }) });
  if (dry.d.clears.length !== 0 || dry.d.claims.length !== 0 || dry.body.would_clear !== 0 || dry.body.dry_run !== true) return false;
  return true;
}

const MUTANTS: [string, string, string][] = [
  ["quiet applied to protocol (exemption removed)", 'c.kind !== "protocol" && inQuietHours(now, c.timezone)', "inQuietHours(now, c.timezone)"],
  ["404/410 falls through to failed (gone branch dropped)", "} else if (result.gone) {", "} else if (false && result.gone) {"],
  ["404/410 counted as sent", "} else if (result.gone) {", "} else if (result.gone) {\n        sent += 1;"],
  ["no releaseClaim on 404/410", "          await d.releaseClaim(c.userId, key);\n          claimed -= 1;\n          cleared += 1;", "          claimed -= 1;\n          cleared += 1;"],
  ["no clearDead on 404/410", "          await d.clearDead(c.userId, c.subscriptionId, c.sub.endpoint);\n", ""],
  ["dry-run writes clear", "    if (live) {\n      const okClaim", "    if (true) {\n      const okClaim"],
];

Deno.test("r3 mutants: unmutated source passes the r3 checks", async () => {
  assert(await r3Ok(await load(SRC)));
});
for (const [name, from, to] of MUTANTS) {
  Deno.test(`r3 mutant caught: ${name}`, async () => {
    assertEquals(SRC.split(from).length - 1, 1, `mutation anchor not unique: ${name}`);
    const m = await load(SRC.replace(from, to));
    assertFalse(await r3Ok(m), `mutant survived: ${name}`);
  });
}
