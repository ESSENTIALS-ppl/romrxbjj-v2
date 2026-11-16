// Standalone lapsed unsubscribe scope (2026-11-15, BUILD ONLY). Live v2 already sends lapsed, but
// UnsubScope had no "lapsed" entry, so those sends failed closed. This adds only that scope.
// check7 and check14 are not live send kinds on v2 and are not added. No P1-06 or P1-08 code.
// The unsubscribe write is simulated with the real unsubscribe token path and column map.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Candidate, KINDS, type Kind, planKind } from "../source/logic.ts";
import { type Deps, handle } from "../source/handler.ts";
import { SCOPE_SETTING, SCOPES, signUnsubToken, type UnsubScope, verifyUnsubToken } from "../_shared/unsub_token.ts";
import { handleTokenRequest, ONE_CLICK_BODY, SCOPE_COLUMN } from "../../unsubscribe/source/token_path.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const SECRET = "s".repeat(40);
const saved = "2026-10-02T00:00:00Z";
type Pref = NonNullable<Candidate["pref"]>;
const basePref = (): Pref => ({
  user_id: U1, reminder_time: "08:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
  created_at: "2026-10-01T00:00:00Z", updated_at: saved, retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved,
});
function cand(over: Partial<Candidate> = {}): Candidate {
  return {
    user_id: U1, email: "alex@example.com", full_name: "Alex Rider", active_sport: "bjj", marketing_opt_out: false, deletion_requested: false,
    pref: basePref(), latest_assessment: { id: "a1", assessed_at: "2026-09-20T12:00:00Z" }, latest_score: 70, previous_score: 66,
    session_dates: [], has_protocol: true, ...over,
  };
}
const canaryAll = { all: true, canary: new Set<string>() };
/** One fixture per live kind at a moment when that kind is due (America/Chicago, reminder 08:00). */
const SCEN: Record<Kind, { now: Date; c: Partial<Candidate> }> = {
  retest: { now: new Date("2026-11-02T14:00:00Z"), c: { latest_assessment: { id: "a-rt", assessed_at: "2026-09-21T13:00:00Z" } } },
  protocol: { now: new Date("2026-11-02T14:00:00Z"), c: {} },
  digest: { now: new Date("2026-11-08T15:00:00Z"), c: {} },
  lapsed: { now: new Date("2026-11-02T14:00:00Z"), c: { session_dates: ["2026-10-19"] } },
};
const dueKinds = (pref: Pref, marketing = false) =>
  KINDS.filter((k) => planKind(k, SCEN[k].now, [cand({ ...SCEN[k].c, pref, marketing_opt_out: marketing })], canaryAll).due.length === 1);

/** Mirrors unsubscribe/source/index.ts: all writes marketing_opt_out + three toggles; else SCOPE_COLUMN[SCOPE_SETTING]. */
async function unsubscribe(token: string, state: { pref: Pref; marketing: boolean }) {
  return await handleTokenRequest(new Request(`https://x.test/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST", body: ONE_CLICK_BODY }), {
    secret: SECRET,
    apply: (_u, scope) => {
      if (scope === "all") { state.marketing = true; state.pref = { ...state.pref, retest_reminders: false, email_reminders: false, weekly_digest: false }; }
      else state.pref = { ...state.pref, [SCOPE_COLUMN[SCOPE_SETTING[scope]]]: false };
      return Promise.resolve(1);
    },
    log: () => Promise.resolve(),
  });
}
function deps(env: Record<string, string>, cands: Candidate[], now: Date) {
  const log = { sends: [] as { headers: Record<string, string>; html: string; text: string }[] };
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => now, load: () => Promise.resolve(cands),
    claim: () => Promise.resolve(true), release: () => Promise.resolve(), send: (p) => { log.sends.push(p as never); return Promise.resolve(true); },
  };
  return { d, log };
}
const ON = { LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET };
const tokenOf = (h: string) => decodeURIComponent(/\?t=([^&>]+)/.exec(h)![1]);

Deno.test("live send kinds are retest, protocol, digest, lapsed (no check7/check14); every kind has a scope", () => {
  assertEquals([...KINDS], ["retest", "protocol", "digest", "lapsed"]);
  for (const k of KINDS) assert(SCOPES.includes(k as UnsubScope), k);
  assertEquals([...SCOPES], ["retest", "protocol", "digest", "all", "lapsed"]);
});
Deno.test("fixtures: each live kind is due on its own scenario with a fully opted-in user", () => {
  assertEquals(dueKinds(basePref()), [...KINDS]);
});
Deno.test("a lapsed token signs and verifies", async () => {
  const t = (await signUnsubToken(SECRET, U1, "lapsed"))!;
  assert(t);
  assertEquals(await verifyUnsubToken(SECRET, t), { userId: U1, scope: "lapsed" });
});

/** After each scope, the kinds that still send. lapsed -> email_reminders, so lapsed AND protocol stop; retest and digest still send. */
const EXPECT: Record<UnsubScope, Kind[]> = {
  lapsed: ["retest", "digest"],
  retest: ["protocol", "digest", "lapsed"],
  protocol: ["retest", "digest"],
  digest: ["retest", "protocol", "lapsed"],
  all: [],
};

Deno.test("the real handler now sends lapsed with a working link (this was failed:1 / fail-closed before)", async () => {
  const { d, log } = deps(ON, [cand(SCEN.lapsed.c)], SCEN.lapsed.now);
  const body = await (await handle(new Request("https://x.test/lifecycle-emails?kind=lapsed", { method: "POST" }), d)).json();
  assertEquals(body.results.lapsed, { sent: 1, already: 0, failed: 0 }, "was failed:1 before (no lapsed scope, fail closed)");
  const t = tokenOf(log.sends[0].headers["List-Unsubscribe"]);
  assertEquals(await verifyUnsubToken(SECRET, t), { userId: U1, scope: "lapsed" });
  const footerKind = tokenOf(/href="(https:\/\/romrxbjj\.com\/unsubscribe\?t=[^"]+)"/.exec(log.sends[0].html)![1]);
  assertEquals((await verifyUnsubToken(SECRET, footerKind))?.scope, "lapsed", "visible footer link carries the lapsed scope");
});
Deno.test("unsubscribe with a lapsed token stops lapsed and protocol; retest and digest still send", async () => {
  const t = (await signUnsubToken(SECRET, U1, "lapsed"))!;
  const state = { pref: basePref(), marketing: false };
  assertEquals(await unsubscribe(t, state), { status: 200, body: { ok: true } });
  assertEquals(dueKinds(state.pref, state.marketing), ["retest", "digest"]);
  // real sender agrees: lapsed and protocol are suppressed; retest and digest still go out
  for (const [kind, want] of [["lapsed", 0], ["protocol", 0], ["retest", 1], ["digest", 1]] as const) {
    const after = deps(ON, [cand({ ...SCEN[kind].c, pref: state.pref })], SCEN[kind].now);
    const b2 = await (await handle(new Request(`https://x.test/lifecycle-emails?kind=${kind}`, { method: "POST" }), after.d)).json();
    assertEquals([b2.results[kind].sent, after.log.sends.length], [want, want], kind);
  }
});
Deno.test("regression: the four existing scopes switch off exactly what they did in v12", async () => {
  for (const scope of ["retest", "protocol", "digest", "all"] as const) {
    const state = { pref: basePref(), marketing: false };
    assertEquals(await unsubscribe((await signUnsubToken(SECRET, U1, scope))!, state), { status: 200, body: { ok: true } });
    assertEquals(dueKinds(state.pref, state.marketing), EXPECT[scope], scope);
  }
});
Deno.test("'all' still blocks every live kind (also each half alone: marketing_opt_out, toggles off)", async () => {
  for (const scope of ["lapsed", "retest", "protocol", "digest"] as const) {
    const state = { pref: basePref(), marketing: false };
    await unsubscribe((await signUnsubToken(SECRET, U1, scope))!, state);
    await unsubscribe((await signUnsubToken(SECRET, U1, "all"))!, state);
    assertEquals(dueKinds(state.pref, state.marketing), [], `after ${scope} then all`);
  }
  assertEquals(dueKinds(basePref(), true), [], "marketing_opt_out alone");
  assertEquals(dueKinds({ ...basePref(), retest_reminders: false, email_reminders: false, weekly_digest: false }, false), [], "three toggles off alone");
  for (const k of KINDS) {
    const { d, log } = deps(ON, [cand({ ...SCEN[k].c, marketing_opt_out: true, pref: { ...basePref(), retest_reminders: false, email_reminders: false, weekly_digest: false } })], SCEN[k].now);
    const b = await (await handle(new Request(`https://x.test/lifecycle-emails?kind=${k}`, { method: "POST" }), d)).json();
    assertEquals([b.results[k].sent, log.sends.length], [0, 0], k);
  }
});
Deno.test("tampered or unknown scopes are rejected; nothing is switched off", async () => {
  const t = (await signUnsubToken(SECRET, U1, "lapsed"))!;
  const [, sig] = t.split(".");
  const forged = btoa(JSON.stringify({ u: U1, s: "all" })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + "." + sig;
  for (const bad of [forged, `${t}x`, "junk"]) {
    const state = { pref: basePref(), marketing: false };
    assertEquals(await unsubscribe(bad, state), { status: 400, body: { ok: false, error: "invalid_token" } });
    assertEquals(dueKinds(state.pref, state.marketing), [...KINDS]);
  }
  assertEquals(await signUnsubToken(SECRET, U1, "check21" as UnsubScope), null);
  assertEquals(await signUnsubToken(SECRET, U1, "check7" as UnsubScope), null, "check7 is not a live scope");
  assertEquals(await signUnsubToken(SECRET, U1, "check14" as UnsubScope), null, "check14 is not a live scope");
});
Deno.test("no signing secret: lapsed still fails closed (no email without opt-out links)", async () => {
  const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all" }, [cand(SCEN.lapsed.c)], SCEN.lapsed.now);
  const b = await (await handle(new Request("https://x.test/lifecycle-emails?kind=lapsed", { method: "POST" }), d)).json();
  assertEquals([b.results.lapsed.failed, log.sends.length], [1, 0]);
});
