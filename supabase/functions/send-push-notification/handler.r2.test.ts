// P1-14 r2 tests: cleared copy, is_test filter, quiet hours, dry-run no network, planted mutants.
// Run: deno test --no-lock --node-modules-dir=none --allow-read --allow-write handler.r2.test.ts
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import * as H from "./handler.ts";
import { handle, inQuietHours, localHourMinute, PUSH_COPY, sendEnabled, type Candidate, type Deps, type PushSub } from "./handler.ts";

const here = new URL(".", import.meta.url);
const FIXTURE = JSON.parse(await Deno.readTextFile(new URL("push_copy.cleared.json", here))) as {
  source: { stacy: string; stacy_sha256: string; kai: string; kai_sha256: string };
  title: { text: string; stacy_line: number; sha256: string };
  kinds: Record<string, { title: string; body: string; body_sha256: string; stacy_line: number; kai_line: number; status: string }>;
};
const KINDS = ["protocol", "retest", "digest", "test"] as const;
const SUB: PushSub = { endpoint: "https://example.com/push/device-1", p256dh: "B" + "x".repeat(40), auth: "a".repeat(16) };

async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function cand(over: Partial<Candidate> = {}): Candidate {
  return { userId: "00000000-0000-4000-8000-0000000000aa", subscriptionId: "sub-1", kind: "protocol", dedupeKey: "protocol:2026-11-16", localDate: "2026-11-16", sub: SUB, timezone: "America/New_York", isTest: false, ...over };
}
type Spy = Deps & { sends: string[]; claims: string[] };
function deps(mod: typeof H, over: Partial<Deps> = {}): Spy {
  const sends: string[] = [];
  const claims: string[] = [];
  return {
    cronCallerOk: async () => true,
    webPushSend: "on",
    vapidPublicKey: "pub-not-a-real-key",
    vapidPrivateKey: "priv-not-a-real-key",
    vapidSubject: "mailto:hello@romrx.io",
    now: () => new Date("2026-11-16T19:45:00Z"), // 2:45 PM ET
    listDue: async () => [cand()],
    claim: async (u, k) => { claims.push(`${u}:${k}`); return true; },
    send: async (_s, payload) => { sends.push(payload); return { ok: true }; },
    markSuccess: async () => {},
    markFailure: async () => {},
    ...over,
    sends,
    claims,
  } as Spy;
}
const post = () => new Request("https://x/send-push-notification", { method: "POST", headers: { "x-cron-secret": "s".repeat(40) }, body: "{}" });
async function run(mod: typeof H, over: Partial<Deps> = {}) {
  const d = deps(mod, over);
  const r = await mod.handle(post(), d);
  return { d, body: await r.json() as Record<string, number | boolean> };
}

// ---------- 1. copy ----------
Deno.test("r2 copy: PUSH_COPY equals Stacy-cleared fixture byte for byte, 4 kinds, sha256 per body", async () => {
  assertEquals(Object.keys(PUSH_COPY), [...KINDS]);
  for (const k of KINDS) {
    assertEquals(PUSH_COPY[k].title, FIXTURE.kinds[k].title);
    assertEquals(PUSH_COPY[k].body, FIXTURE.kinds[k].body);
    assertEquals(await sha256(PUSH_COPY[k].body), FIXTURE.kinds[k].body_sha256);
  }
});

Deno.test("r2 title: every kind's title is exactly 'ROMRx Base' (Stacy 219378b5 'Title for all kinds')", async () => {
  for (const k of KINDS) assertEquals(PUSH_COPY[k].title, "ROMRx Base");
  assertEquals(FIXTURE.title.text, "ROMRx Base");
  assertEquals(await sha256("ROMRx Base"), FIXTURE.title.sha256);
});

const stacyPresent = await Deno.stat(FIXTURE.source.stacy).then(() => true, () => false);
Deno.test({
  name: "r2 copy: each string is verbatim at its recorded line in Stacy 219378b5 (and Kai 481a2e9d for digest)",
  ignore: !stacyPresent,
  fn: async () => {
    const sRaw = await Deno.readTextFile(FIXTURE.source.stacy);
    assertEquals(await sha256(sRaw), FIXTURE.source.stacy_sha256);
    const S = sRaw.split("\n");
    assertEquals(S[FIXTURE.title.stacy_line - 1], `Title for all kinds: ${FIXTURE.title.text}. CLEAR.`);
    for (const k of KINDS) {
      const line = S[FIXTURE.kinds[k].stacy_line - 1];
      assert(line.includes(PUSH_COPY[k].body), `${k} not at Stacy line ${FIXTURE.kinds[k].stacy_line}`);
    }
    const kRaw = await Deno.readTextFile(FIXTURE.source.kai);
    assertEquals(await sha256(kRaw), FIXTURE.source.kai_sha256);
    assert(kRaw.split("\n")[FIXTURE.kinds.digest.kai_line - 1].includes(PUSH_COPY.digest.body));
  },
});

Deno.test("r2 copy: payload sent is the cleared title and body, no score/band/body words", async () => {
  const { d } = await run(H);
  assertEquals(d.sends.length, 1);
  assertEquals(JSON.parse(d.sends[0]), { title: "ROMRx Base", body: FIXTURE.kinds.protocol.body });
  for (const k of KINDS) assertFalse(/score|band|hip|shoulder|knee|mood|pain|injur/i.test(PUSH_COPY[k].body));
});

// ---------- 2. is_test ----------
Deno.test("r2 is_test: test users are skipped (no claim, no send), non-test users are sent", async () => {
  const a = await run(H, { listDue: async () => [cand({ isTest: true })] });
  assertEquals([a.d.sends.length, a.d.claims.length, a.body.skipped_test, a.body.sent], [0, 0, 1, 0]);
  const b = await run(H, { listDue: async () => [cand({ isTest: false })] });
  assertEquals([b.d.sends.length, b.d.claims.length, b.body.skipped_test, b.body.sent], [1, 1, 0, 1]);
});

Deno.test("r2 is_test: unknown flag fails closed (treated as test)", async () => {
  const a = await run(H, { listDue: async () => [cand({ isTest: undefined as unknown as boolean })] });
  assertEquals([a.d.sends.length, a.body.skipped_test], [0, 1]);
});

Deno.test("r2 is_test: no user id is special-cased in the function source (grep proof)", async () => {
  const id = ["7c71", "e421"].join("");
  for (const f of ["handler.ts", "index.ts"]) {
    const src = await Deno.readTextFile(new URL(f, here));
    assertFalse(src.includes(id), `${f} mentions ${id}`);
    assertFalse(/internal_accounts/.test(src), `${f} reads ops.internal_accounts`);
  }
  const idx = await Deno.readTextFile(new URL("index.ts", here));
  assert(idx.includes(`sb.rpc("is_test_account", { p_email: u.email })`));
  assert(idx.includes("const isTest = flags.get(p.user_id) ?? true;"));
  // the same user id with isTest false is sent like anyone else
  const r = await run(H, { listDue: async () => [cand({ userId: `${id}-0000-4000-8000-000000000000`, isTest: false })] });
  assertEquals(r.body.sent, 1);
});

// ---------- 3. quiet hours ----------
const NY = "America/New_York";
const at = (iso: string) => new Date(iso);
Deno.test("r2 quiet: boundaries in America/New_York (start 21:00, end 08:00)", () => {
  assertFalse(inQuietHours(at("2026-11-17T01:59:00Z"), NY)); // 20:59 EST
  assert(inQuietHours(at("2026-11-17T02:00:00Z"), NY)); //       21:00 EST
  assert(inQuietHours(at("2026-11-17T12:59:00Z"), NY)); //       07:59 EST
  assertFalse(inQuietHours(at("2026-11-17T13:00:00Z"), NY)); // 08:00 EST
});
Deno.test("r2 quiet: midnight wrap", () => {
  assert(inQuietHours(at("2026-11-17T04:30:00Z"), NY)); // 23:30
  assert(inQuietHours(at("2026-11-17T05:00:00Z"), NY)); // 00:00
  assert(inQuietHours(at("2026-11-17T05:01:00Z"), NY)); // 00:01
  assert(inQuietHours(at("2026-11-17T08:00:00Z"), NY)); // 03:00
  assertFalse(inQuietHours(at("2026-11-17T17:00:00Z"), NY)); // 12:00
});
Deno.test("r2 quiet: DST fall back (Sun Nov 1 2026) and spring forward (Sun Mar 14 2027) use real local time", () => {
  // Nov 1 2026: after 06:00Z New York is UTC-5. 12:00Z = 07:00 EST (quiet). A fixed UTC-4 offset would say 08:00.
  assert(inQuietHours(at("2026-11-01T12:00:00Z"), NY));
  assertFalse(inQuietHours(at("2026-11-01T13:00:00Z"), NY)); // 08:00 EST
  assert(inQuietHours(at("2026-11-01T05:30:00Z"), NY)); // 01:30 EDT (first)
  assert(inQuietHours(at("2026-11-01T06:30:00Z"), NY)); // 01:30 EST (repeat)
  // Mar 14 2027: after 07:00Z New York is UTC-4. 12:00Z = 08:00 EDT (send). A fixed UTC-5 offset would say 07:00.
  assertFalse(inQuietHours(at("2027-03-14T12:00:00Z"), NY));
  assert(inQuietHours(at("2027-03-14T11:59:00Z"), NY)); // 07:59 EDT
  assertEquals(localHourMinute(at("2027-03-14T07:00:00Z"), NY).hour, 3); // 02:00 does not exist; 03:00 EDT
});
Deno.test("r2 quiet: user timezone is used; null or invalid falls back to America/New_York", () => {
  const t = at("2026-11-17T05:00:00Z"); // 00:00 New York, 21:00 Los Angeles, 06:00 Paris
  assert(inQuietHours(t, "America/Los_Angeles"));
  assert(inQuietHours(t, "Europe/Paris")); // 06:00 Paris
  assert(inQuietHours(t, null)); // 00:00 New York
  assertEquals(localHourMinute(t, "Europe/Paris").hour, 6);
  assertEquals(localHourMinute(t, null).zone, NY);
  assertEquals(localHourMinute(t, "Not/AZone").zone, NY);
  assertEquals(localHourMinute(t, "x".repeat(65)).zone, NY);
  const day = at("2026-11-17T20:00:00Z"); // 15:00 New York, 12:00 Los Angeles
  assertFalse(inQuietHours(day, "America/Los_Angeles"));
});
Deno.test("r2 quiet: in-window candidate is skipped, not claimed, not sent; reported as skipped_quiet", async () => {
  const r = await run(H, { now: () => at("2026-11-17T03:00:00Z") }); // 22:00 EST
  assertEquals([r.d.sends.length, r.d.claims.length, r.body.skipped_quiet, r.body.sent], [0, 0, 1, 0]);
});

// ---------- 4. dry-run ----------
Deno.test("r2 dry-run: no network push, no claim, and it reports skip counts", async () => {
  const realFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (() => { fetches += 1; throw new Error("network in dry-run"); }) as typeof fetch;
  try {
    const due = [
      cand({ userId: "u-test", isTest: true }),
      cand({ userId: "u-quiet", timezone: "Asia/Tokyo" }), // 04:45 Tokyo at 19:45Z
      cand({ userId: "u-ok-1" }),
      cand({ userId: "u-ok-2", timezone: "America/Los_Angeles" }), // 11:45 LA
    ];
    for (const flag of [undefined, "", "ON", "true", "1"]) {
      const r = await run(H, { webPushSend: flag, listDue: async () => due });
      assertEquals(r.body.dry_run, true);
      assertEquals([r.body.due, r.body.skipped_test, r.body.skipped_quiet, r.body.would_send, r.body.claimed, r.body.sent], [4, 1, 1, 2, 0, 0]);
      assertEquals([r.d.sends.length, r.d.claims.length], [0, 0]);
    }
    assertEquals(fetches, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

Deno.test("r2 gate: WEB_PUSH_SEND exact-'on' gate unchanged", async () => {
  assertEquals(sendEnabled("on"), true);
  for (const v of ["ON", "On", "true", "1", " on", "on ", "", undefined]) assertEquals(sendEnabled(v), false);
  const src = await Deno.readTextFile(new URL("handler.ts", here));
  assert(src.includes(`export function sendEnabled(value: string | undefined): boolean {\n  return value === "on";\n}`));
});

// ---------- 5. planted mutants ----------
const SRC = await Deno.readTextFile(new URL("handler.ts", here));
async function load(src: string): Promise<typeof H> {
  const dir = await Deno.makeTempDir({ prefix: "p1-14-r2-mutant-" });
  const f = `${dir}/handler.ts`;
  await Deno.writeTextFile(f, src);
  return await import(`file://${f}`) as typeof H;
}
async function copyOk(m: typeof H) {
  for (const k of KINDS) {
    if (m.PUSH_COPY[k].title !== FIXTURE.kinds[k].title || m.PUSH_COPY[k].body !== FIXTURE.kinds[k].body) return false;
    if (m.PUSH_COPY[k].title !== "ROMRx Base") return false;
  }
  return true;
}
async function filtersOk(m: typeof H) {
  const t = await run(m, { listDue: async () => [cand({ isTest: true })] });
  if (t.d.sends.length !== 0 || t.body.skipped_test !== 1) return false;
  const u = await run(m, { listDue: async () => [cand({ isTest: undefined as unknown as boolean })] });
  if (u.d.sends.length !== 0) return false;
  const q = await run(m, { now: () => at("2026-11-17T02:00:00Z") }); // 21:00 EST
  if (q.d.sends.length !== 0) return false;
  const ok = await run(m);
  return ok.d.sends.length === 1;
}
function quietOk(m: typeof H) {
  return m.inQuietHours(at("2026-11-17T02:00:00Z"), NY) && !m.inQuietHours(at("2026-11-17T01:59:00Z"), NY) &&
    m.inQuietHours(at("2026-11-17T05:00:00Z"), NY) && m.inQuietHours(at("2026-11-17T12:59:00Z"), NY) &&
    !m.inQuietHours(at("2026-11-17T13:00:00Z"), NY) && m.inQuietHours(at("2026-11-01T12:00:00Z"), NY) &&
    !m.inQuietHours(at("2027-03-14T12:00:00Z"), NY);
}
async function dryOk(m: typeof H) {
  const r = await run(m, { webPushSend: undefined });
  return r.d.sends.length === 0 && r.d.claims.length === 0 && m.sendEnabled("ON") === false && m.sendEnabled("true") === false;
}
async function allOk(m: typeof H) {
  return (await copyOk(m)) && (await filtersOk(m)) && quietOk(m) && (await dryOk(m));
}
const MUTANTS: [string, string, string][] = [
  ["title not ROMRx Base", 'protocol: { title: "ROMRx Base"', 'protocol: { title: "ROMRx"'],
  ["one body character changed", "Your retest is due today.", "Your retest is due today!"],
  ["Kai's uncleared protocol line", "Time for today's session. Open ROMRx Base to see your plan.", "Today's plan is ready. It's built from your own assessment."],
  ["is_test filter removed", "    if (c.isTest !== false) { skippedTest += 1; continue; }\n", ""],
  ["is_test fail-open (only explicit true skipped)", "if (c.isTest !== false)", "if (c.isTest === true)"],
  ["quiet filter removed", "    if (inQuietHours(now, c.timezone)) { skippedQuiet += 1; continue; }\n", ""],
  ["quiet start off by one (>)", "hour >= QUIET_START_HOUR", "hour > QUIET_START_HOUR"],
  ["quiet end off by one (<=)", "hour < QUIET_END_HOUR", "hour <= QUIET_END_HOUR"],
  ["no midnight wrap (&&)", "hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR", "hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR"],
  ["fixed UTC-5 offset instead of the zone", 'new Intl.DateTimeFormat("en-US", { timeZone: zone, hour:', 'new Intl.DateTimeFormat("en-US", { timeZone: "Etc/GMT+5", hour:'],
  ["send gate loosened", 'return value === "on";', "return !!value;"],
  ["dry-run claims and sends", "    if (live) {\n      const okClaim", "    if (true) {\n      const okClaim"],
];
Deno.test("r2 mutants: unmutated source passes the same checks", async () => {
  assert(await allOk(await load(SRC)));
});
for (const [name, from, to] of MUTANTS) {
  Deno.test(`r2 mutant caught: ${name}`, async () => {
    assertEquals(SRC.split(from).length - 1, 1, `mutation anchor not unique: ${name}`);
    const m = await load(SRC.replace(from, to));
    assertFalse(await allOk(m), `mutant survived: ${name}`);
  });
}
