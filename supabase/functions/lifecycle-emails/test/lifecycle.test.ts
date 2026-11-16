import { assert, assertEquals, assertFalse, assertMatch } from "jsr:@std/assert@1";
import { audienceAll, type Candidate, explicitOn, flagOn, lapsedNextLine, localParts, nextCheck, planKind, reminderHour, streakDays } from "../source/logic.ts";
import { BRANDS, brandFor, buildEmail, COPY, copyFor } from "../source/email.ts";
import { signUnsubToken, verifyUnsubToken } from "../_shared/unsub_token.ts";
import { CONFIRM_PAGES, type Deps, handle, idList, UNSUB_BASE } from "../source/handler.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const SECRET = "s".repeat(40);
const created = "2026-10-01T00:00:00Z";
const saved = "2026-10-02T00:00:00Z";

function cand(over: Partial<Omit<Candidate, "pref">> & { pref?: Partial<NonNullable<Candidate["pref"]>> | null } = {}): Candidate {
  const { pref, ...rest } = over;
  return {
    user_id: U1, email: "alex@example.com", full_name: "Alex Rider", active_sport: "bjj", marketing_opt_out: false, deletion_requested: false,
    pref: pref === null ? null : {
      user_id: U1, reminder_time: "08:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
      created_at: created, updated_at: saved,
      retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved, ...pref,
    },
    latest_assessment: { id: "a1", assessed_at: "2026-09-20T12:00:00Z" }, latest_score: 70, previous_score: 66,
    session_dates: [], has_protocol: true, ...rest,
  };
}
const canaryAll = { all: true, canary: new Set<string>() };
// Mon 2026-11-02 14:00Z = 08:00 CST (DST ended Nov 1 2026).
const MON_8_CST = new Date("2026-11-02T14:00:00Z");
// Sun 2026-11-01 is the DST change day; use Sun 2026-11-08 15:00Z = 09:00 CST.
const SUN_9_CST = new Date("2026-11-08T15:00:00Z");

Deno.test("flag fail-safe: only exact lowercase 'on'", () => {
  for (const v of [undefined, null, "", "ON", "On", "true", "1", "yes", " on", "on "]) assertFalse(flagOn(v as never), String(v));
  assert(flagOn("on"));
});
Deno.test("audience: only exact 'all' opens everyone", () => {
  for (const v of [undefined, "", "ALL", "All", "true", "on", " all"]) assertFalse(audienceAll(v as never), String(v));
  assert(audienceAll("all"));
});
Deno.test("explicit opt-in: toggle true AND marker present; nothing else counts", () => {
  const p = cand().pref!;
  for (const k of ["retest", "protocol", "digest"] as const) assert(explicitOn(p, k), k);
  // updated_at later than created_at (an old "touched" row) is NOT opt-in any more
  assertFalse(explicitOn({ ...p, retest_opt_in_at: null }, "retest"));
  assertFalse(explicitOn({ ...p, protocol_opt_in_at: undefined }, "protocol"));
  assertFalse(explicitOn({ ...p, digest_opt_in_at: "not a date" }, "digest"));
  assertFalse(explicitOn({ ...p, digest_opt_in_at: "" }, "digest"));
  // a marker with the toggle off or null is not opt-in
  assertFalse(explicitOn({ ...p, retest_reminders: false }, "retest"));
  assertFalse(explicitOn({ ...p, weekly_digest: null }, "digest"));
  // each kind needs ITS OWN marker
  assertFalse(explicitOn({ ...p, retest_opt_in_at: null, protocol_opt_in_at: saved }, "retest"));
  assertFalse(explicitOn(null, "digest"));
});
Deno.test("audience: default-on, touched-but-unmarked and plain-saved rows get nothing in any kind", () => {
  const unmarked = { retest_opt_in_at: null, protocol_opt_in_at: null, digest_opt_in_at: null };
  for (const pref of [{ updated_at: created, ...unmarked }, { updated_at: "2026-10-30T00:00:00Z", ...unmarked }]) {
    const c = cand({ pref });
    for (const k of ["retest", "protocol", "digest"] as const) assertEquals(planKind(k, SUN_9_CST, [c], canaryAll).due.length, 0, k);
  }
  // marker present on one kind only: only that kind is audience
  const only = cand({ pref: { ...unmarked, digest_opt_in_at: saved } });
  assertEquals(planKind("digest", SUN_9_CST, [only], canaryAll).due.length, 1);
  assertEquals(planKind("retest", MON_8_CST, [only], canaryAll).due.length, 0);
});
Deno.test("send time follows reminder_time and timezone (two timezones)", () => {
  const chi = cand({ user_id: U1 });
  const tokyo = cand({ user_id: U2, pref: { user_id: U2, timezone: "Asia/Tokyo", reminder_time: "08:00" } });
  // 14:00Z Mon = 08:00 Chicago, 23:00 Tokyo
  let p = planKind("protocol", MON_8_CST, [chi, tokyo], canaryAll);
  assertEquals(p.due.map((x) => x.user_id), [U1]);
  // 23:00Z Sun = 08:00 Tokyo Mon
  p = planKind("protocol", new Date("2026-11-01T23:00:00Z"), [chi, tokyo], canaryAll);
  assertEquals(p.due.map((x) => x.user_id), [U2]);
  assertEquals(p.due[0].local_date, "2026-11-02");
});
Deno.test("retry window: hour 0 to 2 after target, not 3 and not before", () => {
  const c = cand();
  const at = (z: string) => planKind("protocol", new Date(z), [c], canaryAll).due.length;
  assertEquals(at("2026-11-02T13:00:00Z"), 0); // 07:00
  assertEquals(at("2026-11-02T14:30:00Z"), 1); // 08:30
  assertEquals(at("2026-11-02T16:00:00Z"), 1); // 10:00
  assertEquals(at("2026-11-02T17:00:00Z"), 0); // 11:00
});
Deno.test("bad reminder_time or timezone fall back to 09:00 Chicago", () => {
  assertEquals(reminderHour("garbage"), 9);
  assertEquals(reminderHour(null), 9);
  assertEquals(reminderHour("8:30 PM"), 20);
  assertEquals(reminderHour("12:00 AM"), 0);
  assertEquals(localParts(MON_8_CST, "Not/AZone").tz, "America/Chicago");
});
Deno.test("opt-outs: marketing_opt_out, deletion request, no/invalid email, not canary, no pref", () => {
  const cs = [
    cand({ marketing_opt_out: true }), cand({ deletion_requested: true }), cand({ email: null }), cand({ email: "nope" }), cand({ pref: null }),
  ];
  for (const c of cs) assertEquals(planKind("protocol", MON_8_CST, [c], canaryAll).due.length, 0);
  assertEquals(planKind("protocol", MON_8_CST, [cand()], { all: false, canary: new Set() }).due.length, 0);
  // Live test-stage is canary-listed user ids only (this branch does not include the P1-02 audience rewrite).
  assertEquals(planKind("protocol", MON_8_CST, [cand()], { all: false, canary: new Set([U1]) }).due.length, 1);
});
Deno.test("retest: day 42 to 48 after the latest assessment, once per assessment id", () => {
  const mk = (days: number) => cand({ latest_assessment: { id: "a9", assessed_at: new Date(MON_8_CST.getTime() - days * 86400000).toISOString() } });
  assertEquals(planKind("retest", MON_8_CST, [mk(41)], canaryAll).due.length, 0);
  assertEquals(planKind("retest", MON_8_CST, [mk(42)], canaryAll).due.length, 1);
  assertEquals(planKind("retest", MON_8_CST, [mk(48)], canaryAll).due.length, 1);
  assertEquals(planKind("retest", MON_8_CST, [mk(49)], canaryAll).due.length, 0);
  assertEquals(planKind("retest", MON_8_CST, [mk(100)], canaryAll).due.length, 0); // no go-live sweep of old assessments
  assertEquals(planKind("retest", MON_8_CST, [mk(43)], canaryAll).due[0].email_id, "lc-retest-a9");
});
Deno.test("protocol: skipped when a session is already logged that local date", () => {
  assertEquals(planKind("protocol", MON_8_CST, [cand({ session_dates: ["2026-11-02"] })], canaryAll).due.length, 0);
  assertEquals(planKind("protocol", MON_8_CST, [cand({ session_dates: ["2026-11-01"] })], canaryAll).due.length, 1);
  assertEquals(planKind("protocol", MON_8_CST, [cand({ has_protocol: false })], canaryAll).due.length, 0);
});
Deno.test("digest delta is against the previous assessment, not last week; one assessment = no delta", () => {
  const SUNS = [{ session_dates: [] as string[] }];
  // previous assessment 2 days before the latest (nothing is a week old): still compared
  const near = planKind("digest", SUN_9_CST, [cand({ latest_score: 80, previous_score: 77, ...SUNS[0] })], canaryAll).due[0];
  assertEquals(near.digest!.delta, 3);
  assertEquals(planKind("digest", SUN_9_CST, [cand({ latest_score: 60, previous_score: 71 })], canaryAll).due[0].digest!.delta, -11);
  assertEquals(planKind("digest", SUN_9_CST, [cand({ latest_score: 60, previous_score: 60 })], canaryAll).due[0].digest!.delta, 0);
  assertEquals(planKind("digest", SUN_9_CST, [cand({ latest_score: 60, previous_score: null })], canaryAll).due[0].digest!.delta, null);
  assertEquals(planKind("digest", SUN_9_CST, [cand({ latest_score: null })], canaryAll).skipped.no_score, 1);
});
Deno.test("digest: Sunday 09:00 local only, score change and streak only", () => {
  assertEquals(planKind("digest", MON_8_CST, [cand()], canaryAll).due.length, 0);
  const d = planKind("digest", SUN_9_CST, [cand({ session_dates: ["2026-11-08", "2026-11-07", "2026-11-06"] })], canaryAll).due[0];
  assertEquals(d.digest, { score: 70, delta: 4, streak: 3, sessions_this_week: 3, days_to_next_check: null }); // 70 now vs 66 on the PREVIOUS assessment, whatever the dates
  assertEquals(planKind("digest", SUN_9_CST, [cand({ latest_assessment: null })], canaryAll).due.length, 0);
  assertEquals(streakDays(["2026-11-07", "2026-11-06"], "2026-11-08"), 2); // yesterday counts
  assertEquals(streakDays(["2026-11-05"], "2026-11-08"), 0);
});
Deno.test("email: no scores/health words in subject or preheader, no pixels, no em dash, headers and both opt-outs", () => {
  const links = { offKind: "https://x.test/c?t=A", offAll: "https://x.test/c?t=B", oneClick: "https://x.test/u?t=A&b=bjj" };
  for (const k of ["retest", "protocol", "digest"] as const) {
    const due = { kind: k, user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "bjj", email_id: "x", local_date: "2026-11-08", digest: { score: 71.2, delta: 1.1, streak: 4 } };
    const b = buildEmail(due, BRANDS.bjj, links, "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774");
    const head = `${b.subject} ${COPY[k].preheader}`;
    assertFalse(/\d/.test(head.replace(/\b6-week\b/, "")), `digits in subject/preheader: ${k}`); // the retest cadence "6-week" is a duration, not a score
    assertFalse(/\b(score|pain|injur|mobility|degrees?|rom|mood|joint|hip|shoulder)\b/i.test(head), `health word: ${k}`);
    assertFalse(/<img|pixel|track/i.test(b.html));
    assertFalse(/\u2014|\u2013/.test(b.html + b.text + b.subject));
    assertEquals(b.headers["List-Unsubscribe"], "<https://x.test/u?t=A&b=bjj>");
    assertEquals(b.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert(b.html.includes("t=B") && b.html.includes("t=A") && b.text.includes("t=B"));
    assert(b.html.includes("6605 Longshore Street"));
    assertFalse(/mood/i.test(b.html + b.text));
    assertFalse(b.html.includes("alex@example.com") && b.headers["List-Unsubscribe"].includes("@"));
  }
});
Deno.test("digest body holds score change and streak only", () => {
  const due = { kind: "digest" as const, user_id: U1, email: "a@b.co", first_name: "Alex", active_sport: null, email_id: "x", local_date: "d", digest: { score: 71.2, delta: -2, streak: 1 } };
  const lines = COPY.digest.lines(due).join(" ");
  assertMatch(lines, /Body score: 71\.2, down 2 since your previous assessment/);
  assertFalse(/last week/.test(lines));
  assertMatch(lines, /Current streak: 1 day\./);
});
Deno.test("token: sign, verify, scope bound, tamper, no/short secret fail closed", async () => {
  const t = (await signUnsubToken(SECRET, U1, "digest"))!;
  assertEquals(await verifyUnsubToken(SECRET, t), { userId: U1, scope: "digest" });
  assertEquals(await verifyUnsubToken("x".repeat(40), t), null);
  const [p, s] = t.split(".");
  const forged = btoa(JSON.stringify({ u: U1, s: "all" })).replace(/=+$/, "") + "." + s;
  assertEquals(await verifyUnsubToken(SECRET, forged), null);
  assertEquals(await verifyUnsubToken(SECRET, p), null);
  assertEquals(await signUnsubToken(undefined, U1, "all"), null);
  assertEquals(await signUnsubToken("short", U1, "all"), null);
  assertEquals(await signUnsubToken(SECRET, "not-a-uuid", "all"), null);
  assertEquals(await verifyUnsubToken(undefined, t), null);
});

// ---- handler ----
function deps(env: Record<string, string>, cands: Candidate[], over: Partial<Deps> = {}) {
  const log = { claims: [] as string[], releases: [] as string[], sends: [] as Record<string, unknown>[] };
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => MON_8_CST, load: () => Promise.resolve(cands),
    claim: (u, e) => { log.claims.push(`${u}|${e}`); return Promise.resolve(true); },
    release: (u, e) => { log.releases.push(`${u}|${e}`); return Promise.resolve(); },
    send: (p) => { log.sends.push(p as never); return Promise.resolve(true); }, ...over,
  };
  return { d, log };
}
const req = (q = "") => new Request(`https://x.test/lifecycle-emails${q}`, { method: "POST" });

Deno.test("handler: no cron secret = 403", async () => {
  const { d } = deps({}, [], { cronOk: () => Promise.resolve(false) });
  assertEquals((await handle(req(), d)).status, 403);
});
Deno.test("handler: default is dry run with masked emails, no claims, no sends", async () => {
  const { d, log } = deps({ LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
  const body = await (await handle(req(), d)).json();
  assertEquals(body.dry_run, true);
  assertEquals(body.kinds.protocol.due[0].email, "a***@example.com");
  assertEquals([log.claims.length, log.sends.length], [0, 0]);
});
Deno.test("handler: send flag values other than exact 'on' stay dry", async () => {
  for (const v of ["ON", "true", "1", "", " on"]) {
    const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: v, LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
    assertEquals((await (await handle(req(), d)).json()).dry_run, true, v);
    assertEquals(log.sends.length, 0);
  }
});
Deno.test("handler: ?dry_run=1 beats the send flag", async () => {
  const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
  assertEquals((await (await handle(req("?dry_run=1"), d)).json()).dry_run, true);
  assertEquals(log.sends.length, 0);
});
Deno.test("handler: live test-stage (no audience=all) mails only canary-listed users", async () => {
  const env = { LIFECYCLE_EMAILS_SEND: "on", UNSUBSCRIBE_HMAC_SECRET: SECRET };
  const listed = cand({ user_id: U1 });
  const other = cand({ user_id: U2, email: "other@example.com", pref: { user_id: U2 } });
  const { d, log } = deps(env, [listed, other]);
  const body = await (await handle(req("?kind=protocol"), d)).json();
  assertEquals(body.audience, "canary");
  assertEquals(log.sends.length, 0);
  const { d: d2, log: log2 } = deps({ ...env, LIFECYCLE_CANARY_USER_IDS: U1 }, [listed, other]);
  const body2 = await (await handle(req("?kind=protocol"), d2)).json();
  assertEquals(body2.results.protocol, { sent: 1, already: 0, failed: 0 });
  assertEquals(log2.sends.length, 1);
  assertEquals(log2.sends[0].to, "alex@example.com");
  assertEquals(log2.sends[0].from, "Jim Scott <jim@romrxbjj.com>");
});
Deno.test("handler: flag on with no 'all' and no canary list sends nothing", async () => {
  const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: "on", UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
  const body = await (await handle(req(), d)).json();
  assertEquals(body.audience, "canary");
  assertEquals(log.sends.length, 0);
});
Deno.test("handler: already claimed = no send; send failure releases the claim; missing signing secret sends nothing", async () => {
  const env = { LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET };
  let r = deps(env, [cand()], { claim: () => Promise.resolve(false) });
  assertEquals((await (await handle(req("?kind=protocol"), r.d)).json()).results.protocol.already, 1);
  assertEquals(r.log.sends.length, 0);
  r = deps(env, [cand()], { send: () => Promise.resolve(false) });
  assertEquals((await (await handle(req("?kind=protocol"), r.d)).json()).results.protocol.failed, 1);
  assertEquals(r.log.releases.length, 1);
  r = deps({ LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all" }, [cand()]);
  assertEquals((await (await handle(req("?kind=protocol"), r.d)).json()).results.protocol.failed, 1);
  assertEquals([r.log.claims.length, r.log.sends.length], [0, 0]);
});
Deno.test("handler: LIFECYCLE_SUPPRESS_USER_IDS blocks a user even when everything else says send", async () => {
  const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", LIFECYCLE_SUPPRESS_USER_IDS: U1, UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
  await handle(req(), d);
  assertEquals(log.sends.length, 0);
  assertEquals(idList(`${U1}, junk ,${U2.toUpperCase()}`).size, 2);
});

Deno.test("Base From stays the live sender Jim Scott <jim@romrxbjj.com>; sport-pack senders are unchanged", () => {
  assertEquals(BRANDS.base.from, "Jim Scott <jim@romrxbjj.com>");
  assertEquals(BRANDS.base.replyTo, "jim@romrxbjj.com");
  assertEquals(brandFor(null).from, "Jim Scott <jim@romrxbjj.com>");
  assertEquals(brandFor(undefined).replyTo, "jim@romrxbjj.com");
  assertEquals(BRANDS.bjj.from, "Jim Scott <jim@romrxbjj.com>");
  assertEquals(BRANDS.bjj.replyTo, "jim@romrxbjj.com");
  assertEquals(BRANDS.bodybuilding.from, "Jim Scott <jim@romrxbodybuilding.com>");
  assertEquals(brandFor("bjj").from, BRANDS.bjj.from);
  assertEquals(brandFor("bodybuilding").from, BRANDS.bodybuilding.from);
});
Deno.test("handler: footer links go to the brand confirm page, the one-click header goes to the POST endpoint with the brand", async () => {
  const { d, log } = deps({ LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET }, [cand()]);
  await handle(req("?kind=protocol"), d);
  const sent = log.sends[0] as { html: string; text: string; headers: Record<string, string> };
  const brand = brandFor(cand().active_sport);
  assert(sent.headers["List-Unsubscribe"].startsWith(`<${UNSUB_BASE}?t=`));
  assert(sent.headers["List-Unsubscribe"].includes(`&b=${brand.key}>`));
  assertEquals(sent.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert(sent.html.includes(CONFIRM_PAGES[brand.key] + "?t="), "footer link is the confirm page");
  assert(!sent.html.includes(UNSUB_BASE), "no visible link to the function URL (a GET would apply nothing, but links stay on the confirm page)");
});

Deno.test("P1-16 lapsed: 14 local days quiet, skipped when day-14 check would also be due", () => {
  // Last (and only) activity = assessment 2026-10-18 15:00Z = 2026-10-18 Chicago. Day 14 = 2026-11-01, same day as a check14 due date.
  const assessedOnly = cand({ latest_assessment: { id: "a-l", assessed_at: "2026-10-18T15:00:00Z" }, session_dates: [] });
  const day13 = new Date("2026-10-31T14:00:00Z");
  const day14 = new Date("2026-11-01T14:00:00Z");
  const day16 = new Date("2026-11-03T14:00:00Z");
  assertEquals(planKind("lapsed", day13, [assessedOnly], canaryAll).due.length, 0);
  assertEquals(planKind("lapsed", day14, [assessedOnly], canaryAll).due.length, 0); // defer: same-day as day-14 check math
  assertEquals(planKind("lapsed", day16, [assessedOnly], canaryAll).due[0]?.email_id, "lc-lapsed-2026-10-18");
  // Last session 14 days ago, assessment earlier: lapsed fires on day 14 (check14 is not due).
  const withSession = cand({ latest_assessment: { id: "a-l", assessed_at: "2026-09-01T15:00:00Z" }, session_dates: ["2026-10-18"] });
  const p = planKind("lapsed", day14, [withSession], canaryAll);
  assertEquals(p.due.length, 1);
  assertEquals(p.due[0].email_id, "lc-lapsed-2026-10-18");
  const unmarked = cand({ pref: { protocol_opt_in_at: null, email_reminders: true }, latest_assessment: { id: "a-l", assessed_at: "2026-09-01T15:00:00Z" }, session_dates: ["2026-10-18"] });
  assertEquals(planKind("lapsed", day14, [unmarked], canaryAll).due.length, 0);
});
Deno.test("P1-16 Stacy final words: exact subject and lines, no scores or em dash", () => {
  const links = { offKind: "https://romrx.io/app/unsubscribe?t=k", offAll: "https://romrx.io/app/unsubscribe?t=a", oneClick: "https://example.com/unsub" };
  const postal = "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774";
  const d = buildEmail(
    { kind: "lapsed", user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "general", email_id: "lc-lapsed-x", local_date: "2026-11-03", next_check_line: "Your next check: Monday, December 28" },
    BRANDS.base, links, postal,
  );
  assertEquals(d.subject, "Your ROMRx plan is still here");
  assertEquals(copyFor({ kind: "lapsed", user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "general", email_id: "x", local_date: "2026-11-03" }, BRANDS.base).preheader, "Pick up where you left off.");
  assert(d.text.includes("We haven't seen you in a couple of weeks. Your plan is saved and ready."));
  assert(d.text.includes("You can start again with today's session."));
  assert(d.text.includes("Your next check: Monday, December 28"));
  assert(d.text.includes("Open today's session: https://romrx.io/app/dashboard/my-protocol"));
  assert(d.text.includes("You're getting this because Plan day reminders is on in your ROMRx settings."));
  assert(d.text.includes("Want fewer emails? Change your reminders in Settings: https://romrx.io/app/dashboard/settings"));
  assert(d.text.includes("This message was sent to alex@example.com."));
  assert(d.text.includes("jim@romrxbjj.com"));
  assertFalse(/score|PRS|hip|shoulder|\bjoint\b/i.test(d.subject + d.text));
  assertFalse(d.text.includes("\u2014"));
  assertFalse(/sessions this week|days to next check/i.test(d.text));
  assertEquals(BRANDS.base.from, "Jim Scott <jim@romrxbjj.com>");
});
Deno.test("P1-16 lapsed: protocol opt-in only, no plan skipped, recent sign-in is not quiet", () => {
  const day14 = new Date("2026-11-01T14:00:00Z");
  const base = { latest_assessment: { id: "a-l", assessed_at: "2026-09-01T15:00:00Z" }, session_dates: ["2026-10-18"] as string[] };
  const noPlan = cand({ ...base, has_protocol: false });
  assertEquals(planKind("lapsed", day14, [noPlan], canaryAll).due.length, 0);
  const retestOnly = cand({ ...base, pref: { protocol_opt_in_at: null, retest_opt_in_at: "2026-10-02T00:00:00Z" } });
  assertEquals(planKind("lapsed", day14, [retestOnly], canaryAll).due.length, 0);
  const recentSignIn = cand({ ...base, last_sign_in_at: "2026-10-28T15:00:00Z" });
  assertEquals(planKind("lapsed", day14, [recentSignIn], canaryAll).due.length, 0);
});

Deno.test("P1-15 digest includes sessions this week and days to next check (Stacy CLEAR words)", () => {
  const c = cand({
    session_dates: ["2026-11-02", "2026-11-04", "2026-11-08", "2026-10-20"],
    schedule: { last_assessment_id: "a1", last_assessed_at: "2026-10-01T12:00:00Z", next_retest_at: "2026-11-12T12:00:00Z", next_check_at: "2026-11-10T12:00:00Z" },
  });
  const p = planKind("digest", SUN_9_CST, [c], canaryAll);
  assertEquals(p.due.length, 1);
  assertEquals(p.due[0].digest?.sessions_this_week, 3); // Mon 11/02 - Sun 11/08
  assertEquals(p.due[0].digest?.days_to_next_check, 2); // 11/08 -> 11/10
  const built = buildEmail(p.due[0], BRANDS.base, { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" }, "ROMRx LLC");
  assert(built.text.includes("Sessions this week: 3."));
  assert(built.text.includes("Your next check is in 2 days."));
  assertFalse(built.subject.includes("—") || built.subject.includes("\u2014"));
  assertEquals(BRANDS.base.from, "Jim Scott <jim@romrxbjj.com>");
});
Deno.test("P1-15 digest: omit next-check line when the schedule table/row is absent; today and 1-day wording", () => {
  const dates = ["2026-11-02", "2026-11-04", "2026-11-08", "2026-10-20"];
  const none = planKind("digest", SUN_9_CST, [cand({ session_dates: dates })], canaryAll);
  assertEquals(none.due[0].digest?.sessions_this_week, 3);
  assertEquals(none.due[0].digest?.days_to_next_check, null);
  const builtNone = buildEmail(none.due[0], BRANDS.base, { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" }, "ROMRx LLC");
  assert(builtNone.text.includes("Sessions this week: 3."));
  assertFalse(builtNone.text.includes("Your next check is"));

  const today = planKind("digest", SUN_9_CST, [cand({
    session_dates: dates,
    schedule: { last_assessment_id: "a1", last_assessed_at: "2026-10-01T12:00:00Z", next_retest_at: "2026-11-20T12:00:00Z", next_check_at: "2026-11-08T15:00:00Z" },
  })], canaryAll);
  assertEquals(today.due[0].digest?.days_to_next_check, 0);
  const builtToday = buildEmail(today.due[0], BRANDS.base, { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" }, "ROMRx LLC");
  assert(builtToday.text.includes("Your next check is today."));

  const one = planKind("digest", SUN_9_CST, [cand({
    session_dates: dates,
    schedule: { last_assessment_id: "a1", last_assessed_at: "2026-10-01T12:00:00Z", next_retest_at: "2026-11-20T12:00:00Z", next_check_at: "2026-11-09T15:00:00Z" },
  })], canaryAll);
  assertEquals(one.due[0].digest?.days_to_next_check, 1);
  const builtOne = buildEmail(one.due[0], BRANDS.base, { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" }, "ROMRx LLC");
  assert(builtOne.text.includes("Your next check is in 1 day."));

  // next_check_at in the past: still next_check_at only (no fallback to next_retest_at). Label is "today."
  const past = planKind("digest", SUN_9_CST, [cand({
    session_dates: dates,
    schedule: { last_assessment_id: "a1", last_assessed_at: "2026-10-01T12:00:00Z", next_retest_at: "2026-11-12T12:00:00Z", next_check_at: "2026-11-01T12:00:00Z" },
  })], canaryAll);
  assertEquals(past.due[0].digest?.days_to_next_check, -7); // 11/08 vs next_check_at 11/01
  assertEquals(past.due[0].next_check_line, "Your next check is today.");
  const builtPast = buildEmail(past.due[0], BRANDS.base, { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" }, "ROMRx LLC");
  assert(builtPast.text.includes("Your next check is today."));
  assertFalse(builtPast.text.includes("in 4 days"));
});

Deno.test("W1: digest and lapsed give the same next-check answer on days 1, 8, 20, 42, and 43 after assessment", () => {
  // Column meaning from the user_mobility_schedule migration: next_check_at is the quick re-check due date
  // (last_assessed_at + 7 days; day 14 is derived). next_retest_at is the 42-day full retest and is not read.
  // Assessed 2026-11-01 12:00Z → next_check_at 2026-11-08, next_retest_at 2026-12-13 (Chicago local dates).
  const schedule = {
    last_assessment_id: "a1",
    last_assessed_at: "2026-11-01T12:00:00.000Z",
    next_check_at: "2026-11-08T12:00:00.000Z",
    next_retest_at: "2026-12-13T12:00:00.000Z",
  };
  const tz = "America/Chicago";
  const links = { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" };
  // Same source, two wordings: digest uses the P1-15 sentences (8ce215ca); lapsed uses Stacy's P1-16 words (e1e0a602).
  const cases: { day: number; today: string; label: string; lapsed: string }[] = [
    { day: 1, today: "2026-11-02", label: "Your next check is in 6 days.", lapsed: "Your next check: Sunday, November 8" },
    { day: 8, today: "2026-11-09", label: "Your next check is today.", lapsed: "Your next check is ready now." },
    { day: 20, today: "2026-11-21", label: "Your next check is today.", lapsed: "Your next check is ready now." },
    { day: 42, today: "2026-12-13", label: "Your next check is today.", lapsed: "Your retest is ready now." },
    { day: 43, today: "2026-12-14", label: "Your next check is today.", lapsed: "Your retest is ready now." },
  ];
  for (const { today, label, lapsed } of cases) {
    const n = nextCheck(schedule, today, tz);
    assertEquals(n?.label, label, today);
    const digestDue = {
      kind: "digest" as const, user_id: U1, email: "alex@example.com", first_name: "Alex",
      active_sport: "general", email_id: "x", local_date: today, next_check_line: n?.label ?? null,
      digest: { score: 70, delta: 4, streak: 0, sessions_this_week: 0, days_to_next_check: n ? n.days : null },
    };
    const lapsedDue = {
      kind: "lapsed" as const, user_id: U1, email: "alex@example.com", first_name: "Alex",
      active_sport: "general", email_id: "x", local_date: today,
      next_check_line: lapsedNextLine({ schedule } as unknown as Candidate, tz, new Date(today + "T18:00:00Z"), today),
    };
    const digestText = buildEmail(digestDue, BRANDS.base, links, "ROMRx LLC").text;
    const lapsedText = buildEmail(lapsedDue, BRANDS.base, links, "ROMRx LLC").text;
    const digestLine = digestText.split("\n").find((l) => l.startsWith("Your next check")) ?? null;
    const lapsedLine = lapsedText.split("\n").find((l) => l.startsWith("Your next check") || l.startsWith("Your retest")) ?? null;
    assertEquals(digestLine, label, today);
    assertEquals(lapsedLine, lapsed, today);
  }
  // Fail-soft: no table/row, or next_check_at cleared, omits the line in both emails.
  assertEquals(nextCheck(null, "2026-11-02", tz), null);
  assertEquals(nextCheck(undefined, "2026-11-02", tz), null);
  assertEquals(nextCheck({ last_assessment_id: "a1", last_assessed_at: "2026-11-01T12:00:00.000Z", next_retest_at: "2026-12-13T12:00:00.000Z", next_check_at: null }, "2026-11-02", tz), null);
  const omittedDigest = buildEmail({
    kind: "digest", user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "general",
    email_id: "x", local_date: "2026-11-02", digest: { score: 70, delta: 4, streak: 0, sessions_this_week: 0, days_to_next_check: null },
  }, BRANDS.base, links, "ROMRx LLC").text;
  const omittedLapsed = buildEmail({
    kind: "lapsed", user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "general",
    email_id: "x", local_date: "2026-11-02",
  }, BRANDS.base, links, "ROMRx LLC").text;
  assertFalse(omittedDigest.includes("Your next check"));
  assertFalse(omittedLapsed.includes("Your next check"));
});
