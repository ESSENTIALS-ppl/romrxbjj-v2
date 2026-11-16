// P1-17 handler tests: switches (dry by default), audience, one note and at most one email per note, the email fallback in a
// later run (24 h+ after the note, no activity since, reminder time, plan day, P1-01 opt-in only), sender, headers, and the
// live unsubscribe scopes (no change).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Deps, handle, type NoteInsert } from "../source/handler.ts";
import type { Built } from "../source/email.ts";
import { ROMRX_SENDER } from "../source/email.ts";
import { verifyUnsubToken } from "../_shared/unsub_token.ts";
import { handleTokenRequest, ONE_CLICK_BODY, SCOPE_COLUMN } from "../../unsubscribe/source/token_path.ts";
import { SCOPE_SETTING } from "../../unsubscribe/_shared/unsub_token.ts";
import { cand } from "./fixtures.ts";
import type { Candidate } from "../source/logic.ts";

const SECRET = "s".repeat(40);
const NOW = new Date("2026-11-16T12:30:00Z"); // Mon 7:30 AM ET, day 3 for the fixture: the note run
const LATER = new Date("2026-11-17T13:30:00Z"); // Tue 8:30 AM ET, 25 h after the note: the email run
const NOTE_AT = "2026-11-16T12:30:05Z";
const noted = (over: Partial<Candidate> = {}) => cand({ note: { assessment_id: "aaaaaaaa-0000-4000-8000-000000000001", branch: "A", at: NOTE_AT }, email_already: false, last_session_at: null, last_any_assessment_at: "2026-11-13T14:00:00Z", ...over });
const req = (q = "") => new Request(`https://x.test/rombot-checkin${q}`, { method: "POST" });
function deps(env: Record<string, string>, cands = [cand()], now = NOW) {
  const log = { claims: [] as string[], releases: [] as string[], notes: [] as NoteInsert[], sends: [] as { to: string; b: Built }[] };
  const claimed = new Set<string>();
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => now, load: () => Promise.resolve(cands),
    claim: (u, id) => { log.claims.push(id); if (claimed.has(u + id)) return Promise.resolve(false); claimed.add(u + id); return Promise.resolve(true); },
    release: (u, id) => { log.releases.push(id); claimed.delete(u + id); return Promise.resolve(); },
    insertNote: (n) => { log.notes.push(n); return Promise.resolve(true); },
    send: (to, b) => { log.sends.push({ to, b }); return Promise.resolve(true); },
  };
  return { d, log };
}
const ON = { ROMBOT_CHECKIN_SEND: "on", LIFECYCLE_EMAILS_SEND: "on", LIFECYCLE_AUDIENCE: "all", UNSUBSCRIBE_HMAC_SECRET: SECRET };

Deno.test("cron secret required", async () => {
  const { d } = deps(ON);
  assertEquals((await handle(req(), { ...d, cronOk: () => Promise.resolve(false) })).status, 403);
});
Deno.test("dry by default: no switch set = plan only, no claim, no note, no email, emails masked", async () => {
  for (const env of [{ LIFECYCLE_AUDIENCE: "all" }, { LIFECYCLE_AUDIENCE: "all", ROMBOT_CHECKIN_SEND: "ON" }, { LIFECYCLE_AUDIENCE: "all", ROMBOT_CHECKIN_SEND: "true" }, { ...ON, ROMBOT_CHECKIN_SEND: "" }]) {
    const { d, log } = deps(env as Record<string, string>);
    const j = await (await handle(req(), d)).json();
    assertEquals(j.dry_run, true);
    assertEquals([log.claims.length, log.notes.length, log.sends.length], [0, 0, 0]);
    assertEquals(j.notes[0].note_id, "checkin-d3-aaaaaaaa-0000-4000-8000-000000000001");
    assertEquals(j.emails, []);
    const e = deps(env as Record<string, string>, [noted()], LATER);
    const je = await (await handle(req(), e.d)).json();
    assertEquals(je.emails[0].email, "u***@example.com");
    assertEquals([e.log.claims.length, e.log.sends.length], [0, 0]);
  }
  const { d, log } = deps(ON);
  assertEquals((await (await handle(req("?dry_run=1"), d)).json()).dry_run, true);
  assertEquals(log.notes.length, 0);
});
Deno.test("canary audience with no ids writes nothing", async () => {
  const { d, log } = deps({ ROMBOT_CHECKIN_SEND: "on", LIFECYCLE_EMAILS_SEND: "on", UNSUBSCRIBE_HMAC_SECRET: SECRET });
  await handle(req(), d);
  assertEquals([log.notes.length, log.sends.length], [0, 0]);
});
Deno.test("in-app note: assistant message in a new Base ROMBot chat, no title, button in context_snapshot; no email in the same run", async () => {
  const { d, log } = deps(ON);
  const j = await (await handle(req(), d)).json();
  assertEquals(j.results.notes, 1);
  assertEquals([j.results.emails_sent, log.sends.length], [0, 0]); // Q3: never the same run as the note
  const n = log.notes[0];
  assertEquals(n.conversation.sport, "base");
  assertEquals(n.conversation.provider, "rombot");
  assert(!("title" in n.conversation));
  assertEquals(n.message.role, "assistant");
  assertEquals(n.message.content, "Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?\nIf something got in the way, tell me here and I'll help you find an easier way in.");
  assertEquals(n.conversation.context_snapshot, { kind: "checkin_d3", branch: "A", assessment_id: "aaaaaaaa-0000-4000-8000-000000000001", button: { label: "Start today's session", path: "/dashboard/my-protocol?src=checkin-d3" } });
});
Deno.test("Q4: the in-app note is written for non opt-ins, marketing opt-outs and sport-pack brands too", async () => {
  for (const over of [
    { pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: null } },
    { marketing_opt_out: true }, { active_sport: "bjj" }, { email: null },
  ]) {
    const { d, log } = deps(ON, [cand(over)]);
    const j = await (await handle(req(), d)).json();
    assertEquals([j.results.notes, log.notes.length], [1, 1], JSON.stringify(over));
  }
});
Deno.test("one check-in per assessment: a second run is a no-op", async () => {
  const { d, log } = deps(ON);
  await handle(req(), d);
  const j2 = await (await handle(req(), d)).json();
  assertEquals(j2.results.already, 1);
  assertEquals(log.notes.length, 1);
});
Deno.test("email fallback in a later run: Base sender ROMRx <hello@romrx.io>, Stacy subject, Branch A no extra opener, one-click unsubscribe", async () => {
  const { d, log } = deps(ON, [noted()], LATER);
  const j = await (await handle(req(), d)).json();
  assertEquals([j.results.notes, j.results.emails_sent], [0, 1]);
  const { to, b } = log.sends[0];
  assertEquals(to, "user@example.com");
  // Jim, 9:42 AM ET Nov 16 (as relayed by Grant): "Replies go to hello@, Reid triages them from my inbox." Reply-To is hello@, never reid@.
  assertEquals([b.from, b.replyTo], ["ROMRx <hello@romrx.io>", "hello@romrx.io"]);
  assert(!/reid@/i.test(b.replyTo + b.html + b.text));
  assert(b.html.includes('href="mailto:hello@romrx.io"'));
  assertEquals(ROMRX_SENDER, { from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io" });
  assertEquals(b.subject, "Your plan is ready, Sam");
  // Stacy (Nov 16): Branch A drops the "ROMBot here." opener; its first line already says it.
  assert(b.text.startsWith("Hey Sam, ROMBot here. It's been 3 days"));
  assertEquals(b.text.split("ROMBot here.").length - 1, 1);
  assertEquals(b.html.split("ROMBot here.").length - 1, 1);
  assert(b.text.includes("Today's focus is your shoulders.")); // Tuesday's area
  assert(b.html.includes("https://romrx.io/app/dashboard/my-protocol?src=checkin-d3"));
  assertEquals(b.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert(!/jim@romrx|romrxbjj\.com|romrxbodybuilding\.com/.test(b.html + b.text + b.from + b.replyTo));
  assert(!/[\u2014\u2013]/.test(b.html + b.text + b.subject));
});
Deno.test("at most one email per note: a second later run is a no-op", async () => {
  const { d, log } = deps(ON, [noted()], LATER);
  await handle(req(), d);
  const j2 = await (await handle(req(), d)).json();
  assertEquals([j2.results.emails_already, log.sends.length], [1, 1]);
});
Deno.test("LIFECYCLE_EMAILS_SEND not on: email held, not claimed, not sent", async () => {
  for (const v of ["off", "", "ON"]) {
    const { d, log } = deps({ ...ON, LIFECYCLE_EMAILS_SEND: v }, [noted()], LATER);
    const j = await (await handle(req(), d)).json();
    assertEquals([j.results.emails_held, log.claims.length, log.sends.length], [1, 0, 0]);
  }
});
Deno.test("activity since the note, or a non opt-in: no email", async () => {
  const t = "2026-11-16T20:00:00Z";
  for (const over of [{ last_session_at: t }, { last_any_assessment_at: t }, { last_user_message_at: t }, { pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: null } }] as Partial<Candidate>[]) {
    const { d, log } = deps(ON, [noted(over)], LATER);
    await handle(req(), d);
    assertEquals([log.claims.length, log.sends.length], [0, 0], JSON.stringify(over));
  }
});
Deno.test("no signing secret: no email (fail closed), nothing claimed", async () => {
  const { d, log } = deps({ ...ON, UNSUBSCRIBE_HMAC_SECRET: "" }, [noted()], LATER);
  const j = await (await handle(req(), d)).json();
  assertEquals([j.results.emails_failed, log.claims.length, log.sends.length], [1, 0, 0]);
});
Deno.test("failed note insert releases the note claim; failed send releases the email claim", async () => {
  const a = deps(ON);
  const j = await (await handle(req(), { ...a.d, insertNote: () => Promise.resolve(false) })).json();
  assertEquals([j.results.failed, a.log.releases[0]], [1, "checkin-d3-aaaaaaaa-0000-4000-8000-000000000001"]);
  const b = deps(ON, [noted()], LATER);
  const j2 = await (await handle(req(), { ...b.d, send: () => Promise.resolve(false) })).json();
  assertEquals([j2.results.emails_failed, b.log.releases[0]], [1, "checkin-d3-email-aaaaaaaa-0000-4000-8000-000000000001"]);
});
Deno.test("suppress list is treated as a pending deletion request (no note, no email)", async () => {
  const env = { ...ON, LIFECYCLE_SUPPRESS_USER_IDS: "11111111-1111-4111-8111-111111111111" };
  const { d, log } = deps(env);
  await handle(req(), d);
  const e = deps(env, [noted()], LATER);
  await handle(req(), e.d);
  assertEquals([log.notes.length, e.log.sends.length], [0, 0]);
});
Deno.test("unsubscribe: links carry live scopes only (protocol and all); the live unsubscribe path turns off Plan day reminders", async () => {
  const { d, log } = deps(ON, [noted()], LATER);
  await handle(req(), d);
  const b = log.sends[0].b;
  const oneClick = /<([^>]+)>/.exec(b.headers["List-Unsubscribe"])![1];
  const t = decodeURIComponent(/\?t=([^&]+)/.exec(oneClick)![1]);
  assertEquals(await verifyUnsubToken(SECRET, t), { userId: "11111111-1111-4111-8111-111111111111", scope: "protocol" });
  let col = "";
  const r = await handleTokenRequest(new Request(`https://x.test/unsubscribe?t=${encodeURIComponent(t)}`, { method: "POST", body: ONE_CLICK_BODY }), {
    secret: SECRET, apply: (_u, scope) => { col = scope === "all" ? "all" : SCOPE_COLUMN[SCOPE_SETTING[scope]]; return Promise.resolve(1); }, log: () => Promise.resolve(),
  });
  assert(r !== null && r.status < 400);
  assertEquals(col, "email_reminders");
  const allT = decodeURIComponent(/Turn off all ROMRx emails except account and billing notices: https:\/\/romrx\.io\/app\/unsubscribe\?t=(\S+)/.exec(b.text)![1]);
  assertEquals((await verifyUnsubToken(SECRET, allT))?.scope, "all");
});
