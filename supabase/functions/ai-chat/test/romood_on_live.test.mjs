// Run: node supabase/functions/ai-chat/test/romood_on_live.test.mjs
// ROMBot mood reading, re-cut on LIVE ai-chat v101 (Nov 24 2026). Fake Supabase client and fake fetch: no network, no secrets,
// no prod data, no real emails. Compares the new handler with the saved LIVE v101 handler (test/fixtures/live-v101-handler.js)
// so history, crisis and dash-strip behavior is proven unchanged.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as R from "../romood_chat.js";

let passed = 0;
const t = async (name, fn) => { try { await fn(); passed++; } catch (e) { e.message = `[${name}] ${e.message}`; throw e; } };
const here = path.dirname(new URL(import.meta.url).pathname);
const romoodUrl = pathToFileURL(path.resolve(here, "../romood_chat.js")).href;

let ENV = {};
globalThis.Deno = { env: { get: (k) => ENV[k] } };
async function load(file, env, tag) {
  ENV = { SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "svc", romrx_openai_key: "k", ...env };
  const src = fs.readFileSync(file, "utf8")
    .replace(/^import "jsr:.*$/m, "")
    .replace(/^import \{ createClient as N \}.*$/m, "const N = (...a) => globalThis.__createClient(...a);")
    .replace(/from "\.\/romood_chat\.js";/, `from "${romoodUrl}";`);
  const tmp = path.join(os.tmpdir(), `handler_${tag}_${process.pid}.mjs`);
  fs.writeFileSync(tmp, src);
  const mod = await import(pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  return mod;
}
const NEW = path.resolve(here, "../handler.js");
const LIVE = path.resolve(here, "fixtures/live-v101-handler.js");
const H_LIVE = await load(LIVE, {}, "live");
const H_OFF = await load(NEW, {}, "off");
const H_ON = await load(NEW, { ROMBOT_MOOD: "on" }, "on");
const H_LIVE_HIST = await load(LIVE, { ROMBOT_HISTORY: "on" }, "live_hist");
const H_ON_HIST = await load(NEW, { ROMBOT_MOOD: "on", ROMBOT_HISTORY: "on" }, "on_hist");
const H_TYPO = await load(NEW, { ROMBOT_MOOD: "ON" }, "typo");

const V3 = { saving_on: true, opted_in_at: "2026-11-24T20:00:00Z", consent_version: "v3-rombot-20261028" };
const V2 = { saving_on: true, opted_in_at: "2026-10-27T15:00:00Z", consent_version: "v2-email-20261026" };
function world(over = {}) {
  return {
    uid: "user-A", role: "athlete",
    settingsA: V3,
    history: [],
    modelText: "Your average is Bored, based on 2 check-ins.",
    reads: [], inserts: [], fetches: [],
    ...over,
  };
}
function tables(w) {
  return {
    mood_settings: [{ user_id: "user-A", ...(w.settingsA ?? {}) }, { user_id: "user-B", ...V3 }].filter((r) => w.settingsA || r.user_id !== "user-A"),
    mood_entries: [
      { user_id: "user-A", energy: 5, pleasantness: 5, word: "Bored", created_at: "2026-11-20T15:00:00Z" },
      { user_id: "user-A", energy: 15, pleasantness: 15, word: "Drained", created_at: "2026-11-23T15:00:00Z" },
      { user_id: "user-B", energy: 99, pleasantness: 99, word: "Happy", created_at: "2026-11-23T16:00:00Z" },
    ].filter((r) => !(w.noEntriesA && r.user_id === "user-A")),
    users: [{ id: "user-A", portal_role: w.role, full_name: "Test User", active_sport: "general", sports_enabled: [] }],
    coaches: [{ id: "coach-1", user_id: "user-A" }],
    athletes: [{ user_id: "user-C", coach_id: "coach-1", is_active: true }],
    rombot_context: [{ user_id: "user-A", full_name: "Test User", latest_assessment_id: "as-2", rom_total: 61, joint_scores: [{ joint: "hip_er", left: 38, right: 36, score: 3 }] },
      { user_id: "user-C", full_name: "Athlete C", rom_total: 50 }],
    assessments: [{ id: "as-1", user_id: "user-A", assessed_at: "2026-11-01T15:00:00Z", rom_total: 55, joint_scores: [{ joint_key: "hip_er", score: 2, left_value: 30, right_value: 30 }] }],
    ai_conversations: [{ id: "conv-1", user_id: "user-A" }],
    ai_messages: w.history.map((m) => ({ conversation_id: "conv-1", user_id: "user-A", ...m })),
  };
}
function install(w) {
  const T = tables(w);
  const client = (userScoped) => ({
    auth: { getUser: async () => ({ data: { user: { id: w.uid } }, error: null }) },
    from(table) {
      const f = { table, eq: [], neq: [], mode: "read", userScoped };
      const rows = () => (T[table] ?? []).filter((r) => f.eq.every(([c, v]) => r[c] === v) && f.neq.every(([c, v]) => r[c] !== v));
      const b = {
        select() { return b; }, order() { return b; }, limit() { return b; },
        eq(c, v) { f.eq.push([c, v]); return b; },
        neq(c, v) { f.neq.push([c, v]); return b; },
        maybeSingle() { w.reads.push(f); return Promise.resolve({ data: rows()[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: { id: "conv-new" }, error: null }); },
        insert(x) { f.mode = "insert"; w.inserts.push({ table, x }); return b; },
        update() { f.mode = "update"; return b; },
        then(res, rej) {
          if (f.mode === "read") w.reads.push(f);
          let data = f.mode === "read" ? rows() : null;
          if (table === "ai_messages" && f.mode === "read") data = data.slice().reverse(); // live asks newest first
          return Promise.resolve({ data, error: null }).then(res, rej);
        },
      };
      return b;
    },
    rpc: async () => ({ data: null }),
  });
  globalThis.__createClient = (u, k, o) => client(!!o?.global?.headers?.Authorization);
  globalThis.fetch = async (url, init) => {
    w.fetches.push({ url, body: JSON.parse(init.body) });
    if (/embeddings/.test(url)) return { ok: true, json: async () => ({ data: [{ embedding: null }] }) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: w.modelText } }], usage: { total_tokens: 7 } }) };
  };
}
const jwt = (role) => `h.${Buffer.from(JSON.stringify({ role })).toString("base64")}.s`;
async function ask(H, w, message, extra = {}) {
  install(w);
  const res = await H.handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: `Bearer ${jwt("authenticated")}` }, body: JSON.stringify({ message, sport: "base", ...extra }) }));
  return { status: res.status, ...(await res.json()) };
}
const moodReads = (w) => w.reads.filter((r) => /^mood_/.test(r.table));
const chat = (w) => w.fetches.find((f) => /chat\/completions/.test(f.url));
const EM = /\u2014/;
// Same request on live v101 and on a new handler: identical reply, model request, DB reads and writes.
async function sameAsLive(Hnew, mkWorld, message, extra = {}, Hlive = H_LIVE) {
  const a = mkWorld(), b = mkWorld();
  const ra = await ask(Hlive, a, message, extra), rb = await ask(Hnew, b, message, extra);
  assert.deepEqual(rb, ra, `reply differs from live for: ${message}`);
  assert.deepEqual(b.fetches, a.fetches, `model request differs from live for: ${message}`);
  const noLat = (ins) => JSON.parse(JSON.stringify(ins, (k, v) => (k === "latency_ms" ? "<ms>" : v))); // wall-clock timing only
  assert.deepEqual(noLat(b.inserts), noLat(a.inserts), `writes differ from live for: ${message}`);
  assert.deepEqual(b.reads.map((r) => [r.table, r.eq, r.neq]), a.reads.map((r) => [r.table, r.eq, r.neq]), `reads differ from live for: ${message}`);
  return rb;
}

// ===== 1. Opted in (v3) reads mood =====
await t("opted in (v3) + flag on: reads OWN mood rows with the caller's client, answers with disclaimer and separate line", async () => {
  const w = world();
  const out = await ask(H_ON, w, "how has my mood been this week?");
  const mr = moodReads(w);
  assert.ok(mr.some((r) => r.table === "mood_settings") && mr.some((r) => r.table === "mood_entries"));
  for (const r of mr) { assert.deepEqual(r.eq, [["user_id", "user-A"]]); assert.equal(r.userScoped, true, "mood read must use the caller's JWT client (RLS)"); }
  const sys = JSON.stringify(chat(w).body);
  assert.ok(sys.includes("Your ROMood check-ins") && sys.includes("Check-ins saved: 2"));
  assert.ok(!sys.includes("99"), "another user's rows never reach the model");
  assert.ok(out.reply.startsWith(R.MOOD_DISCLAIMER));
  assert.ok(out.reply.endsWith(R.MOOD_SEPARATE_LINE));
  const saved = w.inserts.find((i) => i.table === "ai_messages");
  assert.equal(saved.x[1].content, out.reply);
});
await t("opted in: disclaimer once per chat (history from the live loader)", async () => {
  const w = world({ history: [{ role: "user", content: "how is my mood", created_at: "1" }, { role: "assistant", content: `${R.MOOD_DISCLAIMER}\n\nx\n\n${R.MOOD_SEPARATE_LINE}`, created_at: "2" }] });
  const out = await ask(H_ON, w, "and my mood lately?", { conversation_id: "conv-1" });
  assert.ok(!out.reply.includes(R.MOOD_DISCLAIMER) && out.reply.endsWith(R.MOOD_SEPARATE_LINE));
});
await t("opted in: a label in the model reply is swapped for the plain code answer", async () => {
  const w = world({ modelText: "You seem depressed." });
  const out = await ask(H_ON, w, "what's my mood average?");
  assert.ok(!/depress/i.test(out.reply) && out.reply.includes("You have 2 check-ins saved."));
});
await t("opted in but no check-ins: fixed no-data reply, no model call", async () => {
  const w = world({ noEntriesA: true });
  const out = await ask(H_ON, w, "how is my mood?");
  assert.equal(out.reply, R.MOOD_NO_DATA_REPLY);
  assert.equal(w.fetches.length, 0);
});
await t("opted in: tip only when asked, fixed text with footer, no model call", async () => {
  const w = world();
  const out = await ask(H_ON, w, "any tips for my mood?");
  assert.equal(w.fetches.length, 0);
  assert.ok(out.reply.includes("General wellness tips, not medical or mental health advice."));
});

// ===== 2. Not opted in gets the 'can't see' (turn on access) reply =====
for (const [name, settingsA] of [["v2 email-only consent", V2], ["saving off", { ...V3, saving_on: false }], ["no tick time", { ...V3, opted_in_at: null }], ["no settings row", null]]) {
  await t(`not opted in (${name}): fixed reply, mood_entries never read, nothing sent to the model`, async () => {
    const w = world({ settingsA });
    const out = await ask(H_ON, w, "how has my mood been?");
    assert.equal(out.reply, R.MOOD_CONSENT_OFF_REPLY);
    assert.equal(out.reply, "Turn on ROMBot access in Settings to ask about your ROMood check-ins.");
    assert.ok(!moodReads(w).some((r) => r.table === "mood_entries"));
    assert.equal(w.fetches.length, 0);
  });
}
await t("coach roster: never reads mood (own or athletes')", async () => {
  const w = world({ role: "coach" });
  await ask(H_ON, w, "how is my athletes' mood?");
  assert.equal(moodReads(w).length, 0);
});

// ===== 3. Flag gate =====
await t("flag OFF (unset) and flag 'ON' (not exactly on): identical to live v101 even for a v3 user asking about mood", async () => {
  for (const H of [H_OFF, H_TYPO]) {
    for (const m of ["how has my mood been this week?", "any tips for my mood?", "how many check-ins do I have"]) {
      await sameAsLive(H, () => world(), m);
    }
  }
  const w = world(); await ask(H_OFF, w, "how has my mood been?"); assert.equal(moodReads(w).length, 0);
});
assert.equal(H_ON.FLAGS.mood, true); assert.equal(H_OFF.FLAGS.mood, false); assert.equal(H_TYPO.FLAGS.mood, false);

// ===== 4. No regression: crisis =====
const CRISIS = ["I want to kill myself", "my mood is terrible and I want to die", "what's the suicide hotline", "call 988", "I'm having chest pain", "how is my mood? I think I overdosed"];
await t("crisis: same fixed live reply (A/B) with flag on or off, before any mood read; nothing sent to a model", async () => {
  for (const m of CRISIS) {
    for (const H of [H_ON, H_OFF]) {
      const out = await sameAsLive(H, () => world(), m);
      assert.ok(out.reply === H_LIVE.CRISIS_REPLY_A || out.reply === H_LIVE.CRISIS_REPLY_B, m);
    }
    const w = world(); await ask(H_ON, w, m); assert.equal(moodReads(w).length, 0, m); assert.equal(w.fetches.length, 0, m);
  }
  assert.equal(H_ON.CRISIS_REPLY_A, H_LIVE.CRISIS_REPLY_A); assert.equal(H_ON.CRISIS_REPLY_B, H_LIVE.CRISIS_REPLY_B);
});
await t("crisis: soft distress right after Reply A still routes to A (history-based), flag on", async () => {
  const mk = () => world({ history: [{ role: "user", content: "I want to die", created_at: "1" }, { role: "assistant", content: H_LIVE.CRISIS_REPLY_A, created_at: "2" }] });
  const out = await sameAsLive(H_ON, mk, "how's my mood, i feel hopeless", { conversation_id: "conv-1" });
  assert.equal(out.reply, H_LIVE.CRISIS_REPLY_A);
});
await t("mood question with module crisis words that the live route does not match: no mood read, falls to the normal live path", async () => {
  const m = "how is my mood, someone is hurting me";
  if (!H_LIVE.detectCrisis(m, [])) {
    const w = world(); await ask(H_ON, w, m); assert.equal(moodReads(w).length, 0);
    await sameAsLive(H_ON, () => world(), m);
  }
});

// ===== 5. No regression: history =====
await t("history: newest 20 from ai_messages, oldest-first, sent to the model exactly as live (flag on, non-mood question)", async () => {
  const hist = []; for (let i = 0; i < 26; i++) hist.push({ role: i % 2 ? "assistant" : "user", content: `m${i}`, created_at: String(i) });
  const out = await sameAsLive(H_ON, () => world({ history: hist }), "what should I stretch today?", { conversation_id: "conv-1" });
  assert.ok(out.reply.length > 0);
});
await t("history: FG-06 foreign conversation_id is still 403 with flag on", async () => {
  const out = await sameAsLive(H_ON, () => world(), "how is my mood?", { conversation_id: "conv-someone-else" });
  assert.equal(out.status, 403);
});
await t("FG-05 assessment history (ROMBOT_HISTORY on): prompt identical to live for a non-mood question", async () => {
  await sameAsLive(H_ON_HIST, () => world(), "how have my scores changed?", {}, H_LIVE_HIST);
});
await t("history (intended, flag on only): earlier mood answers are not re-sent to the model on a non-mood question", async () => {
  const moodAns = `${R.MOOD_DISCLAIMER}\n\nYour average is Bored.\n\n${R.MOOD_SEPARATE_LINE}`;
  const w = world({ history: [{ role: "user", content: "my mood?", created_at: "1" }, { role: "assistant", content: moodAns, created_at: "2" }] });
  await ask(H_ON, w, "what should I stretch?", { conversation_id: "conv-1" });
  assert.ok(!JSON.stringify(chat(w).body).includes("Your average is Bored"));
});

// ===== 6. No regression: dash-strip =====
await t("dash-strip: em dashes removed from model text exactly as live (non-mood), and from mood answers", async () => {
  const mk = () => world({ modelText: "Hip stretch \u2014 60\u201490 seconds \u2014 then rest." });
  const out = await sameAsLive(H_ON, mk, "what stretch for hips?");
  assert.ok(!EM.test(out.reply));
  const w = world({ modelText: "Your average is Bored \u2014 2 check-ins." });
  const o2 = await ask(H_ON, w, "how has my mood been?");
  assert.ok(!EM.test(o2.reply) && o2.reply.includes("Your average is Bored, 2 check-ins."));
  for (const s of [R.MOOD_CONSENT_OFF_REPLY, R.MOOD_NO_DATA_REPLY, R.MOOD_ERROR_REPLY, R.MOOD_PROVIDER_REPLY, R.MOOD_DISCLAIMER, R.MOOD_SEPARATE_LINE]) assert.ok(!/[\u2013\u2014]/.test(s), s);
});

// ===== 7. Other live behavior unchanged with flag on =====
await t("non-mood questions: identical to live with flag on", async () => {
  for (const m of ["what is my overall score?", "give me a hip routine", "how do I feel about training", "I feel tired after class"]) await sameAsLive(H_ON, () => world(), m);
});
await t("anonymous: still rejected exactly as live", async () => {
  const w1 = world(), w2 = world();
  install(w1);
  const mkReq = () => new Request("http://x", { method: "POST", headers: { Authorization: `Bearer ${jwt("anon")}` }, body: JSON.stringify({ message: "how is my mood?" }) });
  const a = await H_LIVE.handleRequest(mkReq()); install(w2); const b = await H_ON.handleRequest(mkReq());
  assert.equal(b.status, a.status); assert.deepEqual(await b.json(), await a.json());
});

console.log(`romood_on_live: ${passed} passed`);
