// P1-08 sender (2026-11-16, BUILD ONLY). Every lifecycle email kind a Base user gets goes out From "ROMRx <hello@romrx.io>"
// with Reply-To "hello@romrx.io" (Stacy's cleared P1-08 / P1-16 words). Sport-pack brands keep their own senders.
// Runs the real handler (send path) per kind; List-Unsubscribe still points at the unsubscribe POST endpoint with a signed token.
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { type Candidate, KINDS, type Kind } from "../source/logic.ts";
import { type Deps, handle } from "../source/handler.ts";
import { BRANDS, brandFor, ROMRX_SENDER } from "../source/email.ts";
import { verifyUnsubToken } from "../_shared/unsub_token.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const SECRET = "s".repeat(40);
const saved = "2026-10-02T00:00:00Z";
type Pref = NonNullable<Candidate["pref"]>;
const pref = (): Pref => ({
  user_id: U1, reminder_time: "08:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
  created_at: "2026-10-01T00:00:00Z", updated_at: saved, retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved,
});
const cand = (sport: string | null, over: Partial<Candidate> = {}): Candidate => ({
  user_id: U1, email: "user@example.com", full_name: "Alex Rider", active_sport: sport, marketing_opt_out: false, deletion_requested: false,
  pref: pref(), latest_assessment: { id: "a1", assessed_at: "2026-09-20T12:00:00Z" }, latest_score: 70, previous_score: 66,
  session_dates: [], has_protocol: true, ...over,
} as Candidate);
/** Same per-kind due scenarios as unsub-scopes.test.ts (America/Chicago stored zone, reminder 08:00). */
export const SCEN: Record<Kind, { now: Date; c: Partial<Candidate> }> = {
  retest: { now: new Date("2026-11-02T14:00:00Z"), c: { latest_assessment: { id: "a-rt", assessed_at: "2026-09-21T13:00:00Z" } } },
  protocol: { now: new Date("2026-11-02T14:00:00Z"), c: {} },
  digest: { now: new Date("2026-11-08T15:00:00Z"), c: {} },
  check7: { now: new Date("2026-11-01T14:00:00Z"), c: { latest_assessment: { id: "a-ck", assessed_at: "2026-10-25T15:00:00Z" } } },
  check14: { now: new Date("2026-11-08T15:00:00Z"), c: { latest_assessment: { id: "a-ck", assessed_at: "2026-10-25T15:00:00Z" } } },
  lapsed: { now: new Date("2026-11-02T14:00:00Z"), c: { session_dates: ["2026-10-19"] } },
};
type Sent = { from: string; replyTo: string; to: string; subject: string; html: string; text: string; headers: Record<string, string> };
export async function sendOne(kind: Kind, sport: string | null): Promise<Sent[]> {
  const sends: Sent[] = [];
  const env: Record<string, string> = { LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET };
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => SCEN[kind].now, load: () => Promise.resolve([cand(sport, SCEN[kind].c)]),
    claim: () => Promise.resolve(true), release: () => Promise.resolve(), send: (p) => { sends.push(p as Sent); return Promise.resolve(true); },
  };
  const body = await (await handle(new Request(`https://x.test/lifecycle-emails?kind=${kind}`, { method: "POST" }), d)).json();
  assertEquals(body.results[kind], { sent: 1, already: 0, failed: 0 }, `${kind}/${sport} sends once`);
  return sends;
}

Deno.test("P1-08 sender constant is exactly ROMRx <hello@romrx.io> / hello@romrx.io and is the Base brand's sender", () => {
  assertEquals(ROMRX_SENDER.from, "ROMRx <hello@romrx.io>");
  assertEquals(ROMRX_SENDER.replyTo, "hello@romrx.io");
  assertEquals([BRANDS.base.from, BRANDS.base.replyTo], [ROMRX_SENDER.from, ROMRX_SENDER.replyTo]);
  for (const s of [null, undefined, "general", "base", "mobility"]) assertEquals(brandFor(s).key, "base", String(s));
});
Deno.test("the six kinds are every kind the function sends", () => {
  assertEquals([...KINDS].sort(), ["check14", "check7", "digest", "lapsed", "protocol", "retest"]);
});
for (const kind of KINDS) {
  for (const sport of [null, "general"]) {
    Deno.test(`P1-08 sender: ${kind} for a Base user (active_sport ${sport}) is From ROMRx <hello@romrx.io>, Reply-To hello@romrx.io`, async () => {
      const [s] = await sendOne(kind, sport);
      assertEquals(s.from, "ROMRx <hello@romrx.io>");
      assertEquals(s.replyTo, "hello@romrx.io");
      assertEquals(s.to, "user@example.com");
      // List-Unsubscribe unchanged in shape: the POST endpoint with a signed token for this kind and the base brand, plus one-click.
      const lu = s.headers["List-Unsubscribe"];
      assert(/^<https:\/\/[^>]+\/functions\/v1\/unsubscribe\?t=[^&>]+&b=base>$/.test(lu), lu);
      assertEquals(s.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
      const t = decodeURIComponent(/\?t=([^&>]+)/.exec(lu)![1]);
      assertEquals(await verifyUnsubToken(SECRET, t), { userId: U1, scope: kind });
      // HTML footer contact link (brand.replyTo) shows the same address, as in Stacy's words
      assert(s.html.includes('href="mailto:hello@romrx.io"'), "footer mailto");
      assertEquals(/romrxbjj\.com|romrxbodybuilding\.com/.test(s.text + s.html), false, "no sport-pack domain in a Base email");
    });
  }
}
Deno.test("sport-pack brands keep their own senders (not part of P1-08)", async () => {
  for (const sport of ["bjj", "bodybuilding"]) {
    const [s] = await sendOne("protocol", sport);
    assertEquals([s.from, s.replyTo], [BRANDS[sport].from, BRANDS[sport].replyTo]);
    assertNotEquals(s.from, ROMRX_SENDER.from);
  }
});
