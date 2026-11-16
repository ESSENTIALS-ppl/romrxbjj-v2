// P1-17 handler tests: switches (dry by default), audience, one note and at most one email per assessment, the email
// fallback (plan day + reminder time + P1-01 opt-in only), sender, headers, and the live unsubscribe scopes (no change).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Deps, handle, type NoteInsert } from "../source/handler.ts";
import type { Built } from "../source/email.ts";
import { ROMRX_SENDER } from "../source/email.ts";
import { verifyUnsubToken } from "../_shared/unsub_token.ts";
import { handleTokenRequest, ONE_CLICK_BODY, SCOPE_COLUMN } from "../../unsubscribe/source/token_path.ts";
import { SCOPE_SETTING } from "../../unsubscribe/_shared/unsub_token.ts";
import { cand } from "./fixtures.ts";

const SECRET = "s".repeat(40);
const NOW = new Date("2026-11-16T12:30:00Z"); // Mon 7:30 AM ET, day 3 for the fixture
const req = (q = "") => new Request(`https://x.test/rombot-checkin${q}`, { method: "POST" });
function deps(env: Record<string, string>, cands = [cand()]) {
  const log = { claims: [] as string[], releases: [] as string[], notes: [] as NoteInsert[], sends: [] as { to: string; b: Built }[] };
  const claimed = new Set<string>();
  const d: Deps = {
    env: (k) => env[k], cronOk: () => Promise.resolve(true), now: () => NOW, load: () => Promise.resolve(cands),
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
    assertEquals(j.due[0].email, "u***@example.com");
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
Deno.test("in-app note: assistant message in a new Base ROMBot chat, no title, button in context_snapshot", async () => {
  const { d, log } = deps({ ...ON, LIFECYCLE_EMAILS_SEND: "off" });
  const j = await (await handle(req(), d)).json();
  assertEquals(j.results.notes, 1);
  assertEquals(j.results.emails_held, 1); // lifecycle send switch off: note only
  const n = log.notes[0];
  assertEquals(n.conversation.sport, "base");
  assertEquals(n.conversation.provider, "rombot");
  assert(!("title" in n.conversation));
  assertEquals(n.message.role, "assistant");
  assertEquals(n.message.content, "Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?\nIf something got in the way, tell me here and I'll help you find an easier way in.");
  assertEquals(n.conversation.context_snapshot.button, { label: "Start today's session", path: "/dashboard/my-protocol?src=checkin-d3" });
  assertEquals(log.sends.length, 0);
});
Deno.test("one check-in per assessment: a second run is a no-op", async () => {
  const { d, log } = deps(ON);
  await handle(req(), d);
  const j2 = await (await handle(req(), d)).json();
  assertEquals(j2.results.already, 1);
  assertEquals([log.notes.length, log.sends.length], [1, 1]);
});
Deno.test("email fallback: Base sender ROMRx <hello@romrx.io>, Stacy subject, opener, one-click unsubscribe", async () => {
  const { d, log } = deps(ON);
  const j = await (await handle(req(), d)).json();
  assertEquals(j.results.emails_sent, 1);
  const { to, b } = log.sends[0];
  assertEquals(to, "user@example.com");
  assertEquals([b.from, b.replyTo], ["ROMRx <hello@romrx.io>", "hello@romrx.io"]);
  assertEquals(ROMRX_SENDER, { from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io" });
  assertEquals(b.subject, "Your plan is ready, Sam");
  assert(b.text.startsWith("ROMBot here.\n\nHey Sam, ROMBot here."));
  assert(b.html.includes(">ROMBot here.</p>"));
  assert(b.html.includes("https://romrx.io/app/dashboard/my-protocol?src=checkin-d3"));
  assertEquals(b.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert(!/jim@romrx|romrxbjj\.com|romrxbodybuilding\.com/.test(b.html + b.text + b.from + b.replyTo));
  assert(!/[\u2014\u2013]/.test(b.html + b.text + b.subject));
});
Deno.test("email skipped (note kept) for non opt-ins, marketing opt-out and sport-pack brands", async () => {
  for (const over of [
    { pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: null } },
    { marketing_opt_out: true }, { active_sport: "bjj" },
  ]) {
    const { d, log } = deps(ON, [cand(over)]);
    const j = await (await handle(req(), d)).json();
    assertEquals([j.results.notes, j.results.emails_skipped, log.sends.length], [1, 1, 0], JSON.stringify(over));
  }
});
Deno.test("no signing secret: no email (fail closed), note kept", async () => {
  const { d, log } = deps({ ...ON, UNSUBSCRIBE_HMAC_SECRET: "" });
  const j = await (await handle(req(), d)).json();
  assertEquals([j.results.notes, j.results.emails_failed, log.sends.length], [1, 1, 0]);
});
Deno.test("failed note insert releases the claim and sends no email; failed send releases the email claim", async () => {
  const a = deps(ON);
  const j = await (await handle(req(), { ...a.d, insertNote: () => Promise.resolve(false) })).json();
  assertEquals([j.results.failed, a.log.releases[0], a.log.sends.length], [1, "checkin-d3-aaaaaaaa-0000-4000-8000-000000000001", 0]);
  const b = deps(ON);
  const j2 = await (await handle(req(), { ...b.d, send: () => Promise.resolve(false) })).json();
  assertEquals([j2.results.emails_failed, b.log.releases[0]], [1, "checkin-d3-email-aaaaaaaa-0000-4000-8000-000000000001"]);
});
Deno.test("suppress list is treated as a pending deletion request", async () => {
  const { d, log } = deps({ ...ON, LIFECYCLE_SUPPRESS_USER_IDS: "11111111-1111-4111-8111-111111111111" });
  await handle(req(), d);
  assertEquals(log.notes.length, 0);
});
Deno.test("unsubscribe: links carry live scopes only (protocol and all); the live unsubscribe path turns off Plan day reminders", async () => {
  const { d, log } = deps(ON);
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
