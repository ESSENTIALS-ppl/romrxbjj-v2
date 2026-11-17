// P1-08 quick-check suppression guard (2026-11-16, BUILD ONLY). Version A emails (check7, and check14
// with no current-cycle quick row) link to /dashboard/quick-check and are chosen only when QUICK_CHECK_ON
// is exactly "on". When the flag is off (the default, matching the client's QUICK_CHECK_ON = false),
// use version B, or skip if there is no B. Version B (check14 with a quick row) still sends. Nothing
// is deployed; LIFECYCLE_EMAILS_SEND is not touched.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { type Candidate, flagOn, planKind, quickCheckOn } from "../source/logic.ts";
import { BRANDS, buildEmail, QUICK_CHECK_PATH } from "../source/email.ts";
import { type Deps, handle } from "../source/handler.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const created = "2026-10-01T00:00:00Z";
const saved = "2026-10-02T00:00:00Z";
const ASSESSED = "2026-10-25T15:00:00Z";
const day7 = new Date("2026-11-01T14:00:00Z"); // 08:00 CST
const day14 = new Date("2026-11-08T15:00:00Z");

function cand(over: Partial<Omit<Candidate, "pref">> & { pref?: Partial<NonNullable<Candidate["pref"]>> | null } = {}): Candidate {
  const { pref, ...rest } = over;
  return {
    user_id: U1, email: "alex@example.com", full_name: "Alex Rider", active_sport: "general", marketing_opt_out: false, deletion_requested: false,
    pref: pref === null ? null : {
      user_id: U1, reminder_time: "08:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
      created_at: created, updated_at: saved,
      retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved, ...pref,
    },
    latest_assessment: { id: "a-check", assessed_at: ASSESSED }, latest_score: 70, previous_score: 66,
    session_dates: [], has_protocol: true, ...rest,
  };
}
const off = { all: true, canary: new Set<string>() }; // quickCheckOn omitted = off
const on = { all: true, canary: new Set<string>(), quickCheckOn: true };
const cA = () => cand(); // no current-cycle quick row: check7 and check14 would be version A
const cB = () => cand({ has_quick_check: true }); // check14 version B

Deno.test("quickCheckOn is the same fail-safe as flagOn: only exactly 'on' is true, and it defaults off", () => {
  for (const v of [undefined, null, "", "true", "TRUE", "True", "1", "yes", "ON", "On", "off", "false"]) {
    assertEquals(quickCheckOn(v as never), false, String(v));
    assertEquals(quickCheckOn(v as never), flagOn(v as never), String(v));
  }
  assertEquals(quickCheckOn("on"), true);
  assertEquals(quickCheckOn("on"), flagOn("on"));
});

Deno.test("flag off (default): check7 has no version B, so it is skipped with quick_check_off", () => {
  const p = planKind("check7", day7, [cA()], off);
  assertEquals(p.due.length, 0);
  assertEquals(p.skipped.quick_check_off, 1);
  assertEquals(planKind("check7", day7, [cA()], { all: true, canary: new Set(), quickCheckOn: false }).due.length, 0);
});

Deno.test("flag off: check14 with no quick row is version A, so it is skipped with quick_check_off", () => {
  const p = planKind("check14", day14, [cA()], off);
  assertEquals(p.due.length, 0);
  assertEquals(p.skipped.quick_check_off, 1);
});

Deno.test("flag off: check14 version B (quick already done) still sends, and the copy does not link to /dashboard/quick-check", () => {
  const p = planKind("check14", day14, [cB()], off);
  assertEquals(p.due.length, 1);
  assertEquals(p.due[0].quick_check_done, true);
  assertEquals(p.skipped.quick_check_off, undefined);
  const built = buildEmail(
    { ...p.due[0], first_name: "Alex", next_check_date: "Sunday, December 6" },
    BRANDS.base,
    { offKind: "https://romrx.io/app/unsubscribe?t=k", offAll: "https://romrx.io/app/unsubscribe?t=a", oneClick: "https://example.com/unsub" },
    "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774",
  );
  assertEquals(built.subject, "Two weeks of ROMRx");
  assert(built.text.includes("Open today's session: https://romrx.io/app/dashboard/my-protocol"));
  assertFalse(built.text.includes(QUICK_CHECK_PATH));
  assertFalse(built.html.includes(QUICK_CHECK_PATH));
});

Deno.test("flag off: other kinds are unchanged (retest, protocol, digest, lapsed still plan as before)", () => {
  const retest = cand({ latest_assessment: { id: "a-rt", assessed_at: "2026-09-21T13:00:00Z" } });
  assertEquals(planKind("retest", new Date("2026-11-02T14:00:00Z"), [retest], off).due.length, 1);
  assertEquals(planKind("protocol", new Date("2026-11-02T14:00:00Z"), [cand()], off).due.length, 1);
  assertEquals(planKind("digest", new Date("2026-11-08T15:00:00Z"), [cand()], off).due.length, 1);
  const lapsed = cand({ session_dates: ["2026-10-19"], latest_assessment: { id: "a-old", assessed_at: "2026-10-10T15:00:00Z" } });
  assertEquals(planKind("lapsed", new Date("2026-11-02T14:00:00Z"), [lapsed], off).due.length, 1);
});

Deno.test("flag on: check7 and check14 version A are chosen and link to /dashboard/quick-check; version B is unchanged", () => {
  const p7 = planKind("check7", day7, [cA()], on);
  assertEquals(p7.due.length, 1);
  assertEquals(p7.due[0].email_id, "lc-check7-a-check");
  const p14a = planKind("check14", day14, [cA()], on);
  assertEquals(p14a.due.length, 1);
  assertEquals(p14a.due[0].quick_check_done, false);
  const p14b = planKind("check14", day14, [cB()], on);
  assertEquals(p14b.due.length, 1);
  assertEquals(p14b.due[0].quick_check_done, true);

  const links = { offKind: "https://romrx.io/app/unsubscribe?t=k", offAll: "https://romrx.io/app/unsubscribe?t=a", oneClick: "https://example.com/unsub" };
  const postal = "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774";
  const d7 = buildEmail({ ...p7.due[0], first_name: "Alex", retest_date: "Sunday, December 6" }, BRANDS.base, links, postal);
  const d14a = buildEmail({ ...p14a.due[0], first_name: "Alex", retest_date: "Sunday, December 6" }, BRANDS.base, links, postal);
  const d14b = buildEmail({ ...p14b.due[0], first_name: "Alex", next_check_date: "Sunday, December 6" }, BRANDS.base, links, postal);
  assertEquals(d7.subject, "Your ROMRx quick check is ready");
  assert(d7.text.includes(`Start my quick check: https://romrx.io/app${QUICK_CHECK_PATH}`));
  assertEquals(d14a.subject, "Your quick check is waiting");
  assert(d14a.text.includes(`Start my quick check: https://romrx.io/app${QUICK_CHECK_PATH}`));
  assertEquals(d14b.subject, "Two weeks of ROMRx");
  assertFalse(d14b.text.includes(QUICK_CHECK_PATH));
});

Deno.test("check7 already-done still skips as not_due, even when the flag is on (does not become version A)", () => {
  const pOn = planKind("check7", day7, [cB()], on);
  assertEquals(pOn.due.length, 0);
  assertEquals(pOn.skipped.not_due, 1);
  assertEquals(pOn.skipped.quick_check_off, undefined);
  const pOff = planKind("check7", day7, [cB()], off);
  assertEquals(pOff.due.length, 0);
  assertEquals(pOff.skipped.not_due, 1, "already-done is classified before the flag check");
});

type Sent = { from: string; to: string; subject: string; html: string; text: string; headers: Record<string, string> };
async function runHandle(kind: "check7" | "check14", env: Record<string, string>, over: Partial<Candidate> = {}) {
  const sends: Sent[] = [];
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => kind === "check7" ? day7 : day14,
    load: () => Promise.resolve([cand(over)]),
    claim: () => Promise.resolve(true), release: () => Promise.resolve(),
    send: (p) => { sends.push(p as Sent); return Promise.resolve(true); },
  };
  const body = await (await handle(new Request(`https://x.test/lifecycle-emails?kind=${kind}`, { method: "POST" }), d)).json();
  return { body, sends };
}

Deno.test("handler: QUICK_CHECK_ON unset (or not exactly 'on') skips version A and still sends version B; no send switch is written", async () => {
  const base = { LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: "s".repeat(40) };
  // extras is explicitly Record<string, string>[] so spreading {} does not make QUICK_CHECK_ON: string | undefined (TS2345).
  const extras: Record<string, string>[] = [{}, { QUICK_CHECK_ON: "" }, { QUICK_CHECK_ON: "true" }, { QUICK_CHECK_ON: "TRUE" }, { QUICK_CHECK_ON: "1" }];
  for (const extra of extras) {
    const env: Record<string, string> = { ...base, ...extra };
    const a7 = await runHandle("check7", env);
    assertEquals(a7.body.results.check7, { sent: 0, already: 0, failed: 0 }, JSON.stringify(extra));
    assertEquals(a7.sends.length, 0);
    const a14 = await runHandle("check14", env);
    assertEquals(a14.body.results.check14, { sent: 0, already: 0, failed: 0 }, JSON.stringify(extra));
    const b14 = await runHandle("check14", env, { has_quick_check: true });
    assertEquals(b14.body.results.check14, { sent: 1, already: 0, failed: 0 }, JSON.stringify(extra));
    assertEquals(b14.sends[0].subject, "Two weeks of ROMRx");
    assertFalse(b14.sends[0].text.includes(QUICK_CHECK_PATH));
  }
  // Dry run with the flag off also reports the skip and does not mention a send-switch write.
  const dry = await runHandle("check7", { LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: "s".repeat(40) });
  assertEquals(dry.body.dry_run, true);
  assertEquals(dry.body.send_enabled, false);
  assertEquals(dry.body.kinds.check7.due.length, 0);
  assertEquals(dry.body.kinds.check7.skipped.quick_check_off, 1);
  assertEquals(dry.sends.length, 0);
});

Deno.test("handler: QUICK_CHECK_ON=on chooses version A and the body links to /dashboard/quick-check", async () => {
  const env = { LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: "s".repeat(40), QUICK_CHECK_ON: "on" };
  const a7 = await runHandle("check7", env);
  assertEquals(a7.body.results.check7, { sent: 1, already: 0, failed: 0 });
  assertEquals(a7.sends[0].subject, "Your ROMRx quick check is ready");
  assert(a7.sends[0].text.includes(`https://romrx.io/app${QUICK_CHECK_PATH}`));
  const a14 = await runHandle("check14", env);
  assertEquals(a14.body.results.check14, { sent: 1, already: 0, failed: 0 });
  assertEquals(a14.sends[0].subject, "Your quick check is waiting");
  assert(a14.sends[0].text.includes(`https://romrx.io/app${QUICK_CHECK_PATH}`));
});
