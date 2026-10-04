// Run: node supabase/functions/ai-chat/test/note_and_chat_owner.test.mjs
// Covers two ai-chat fixes:
//  1. The hidden per-turn note (today sent inside `message` by the +Yoga client, tomorrow maybe in `turn_context`) is shown to the
//     model for that turn but is never stored, never becomes the chat title, and never replaces the research search text.
//  2. A chat id from the client is only used if that chat belongs to the caller.
// handler.js imports jsr: modules and reads Deno.env at load, so strip the imports, stub Deno, and inject a fake supabase client.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

globalThis.Deno = { env: { get: () => undefined } };
const src = "const N = (...a) => globalThis.__createClient(...a);\n" +
  fs.readFileSync(new URL("../handler.js", import.meta.url), "utf8").replace(/^import .*$/gm, "");
const tmp = path.join(os.tmpdir(), `handler_under_test_${process.pid}.mjs`);
fs.writeFileSync(tmp, src);
const h = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

// ---------- fixtures ----------
// Same shape the current +Yoga client builds (src/lib/rombot.ts buildPreface): start marker, rules, pose statuses, end marker.
const NOTE = [
  "[Background for this answer only. Follow it.]",
  "Answer directly, in a calm tone. This is educational use only. It is not medical advice.",
  "Answer only about yoga poses and what the pose colors mean.",
  "What this person sees on the Poses screen right now (pose name -> status):",
  "In range: Child's Pose, Cat Cow",
  "Close: Low Lunge",
  "Below range: Pigeon",
  "Not rated: every other pose (150 poses). Do not name a color for them.",
  "[End of background. The question follows.]",
].join("\n");
const QUESTION = "Why is Pigeon below range for me?";
const YOGA_MESSAGE = `${NOTE}\n\n${QUESTION}`;
assert.ok(YOGA_MESSAGE.indexOf(QUESTION) > 300, "fixture note is long, like the real one");

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (sub) => `${b64({ alg: "none" })}.${b64({ role: "authenticated", sub })}.sig`;

// ---------- tiny fake supabase ----------
function makeDb() {
  const db = {
    users: [{ id: "u1", portal_role: "athlete", full_name: "Test One", active_sport: "bjj", sports_enabled: ["bjj"] }],
    user_ai_preferences: [],
    rombot_context: [{ user_id: "u1", full_name: "Test One", worst_joints: [], joint_scores: [], protocol: [], saved_game_plans: [] }],
    ai_conversations: [
      { id: "c-own", user_id: "u1", title: "Own chat" },
      { id: "c-other", user_id: "u2", title: "Someone else" },
    ],
    ai_messages: [
      { conversation_id: "c-own", user_id: "u1", role: "user", content: "OWN-HISTORY-QUESTION", created_at: 1 },
      { conversation_id: "c-other", user_id: "u2", role: "user", content: "SECRET-OTHER-USER-TEXT", created_at: 1 },
    ],
    rpcCalls: [],
    nextId: 1,
  };
  function from(table) {
    const st = { table, op: "select", filters: [], payload: null, single: false };
    const exec = () => {
      const rows = db[table];
      if (st.op === "insert") {
        const items = Array.isArray(st.payload) ? st.payload : [st.payload];
        const made = items.map((r) => ({ id: r.id ?? `new-${db.nextId++}`, ...r }));
        rows.push(...made);
        return { data: st.single ? made[0] : made, error: null };
      }
      const hit = rows.filter((r) => st.filters.every(([k, v]) => r[k] === v));
      if (st.op === "update") {
        hit.forEach((r) => Object.assign(r, st.payload));
        return { data: null, error: null };
      }
      return { data: st.single ? hit[0] ?? null : hit, error: null };
    };
    const q = {
      select: () => q,
      insert: (p) => { st.op = "insert"; st.payload = p; return q; },
      update: (p) => { st.op = "update"; st.payload = p; return q; },
      eq: (k, v) => { st.filters.push([k, v]); return q; },
      order: () => q,
      limit: () => q,
      maybeSingle: () => { st.single = true; return q; },
      single: () => { st.single = true; return q; },
      then: (res, rej) => Promise.resolve(exec()).then(res, rej),
    };
    return q;
  }
  const client = (userId) => ({
    from,
    rpc: async (name, args) => { db.rpcCalls.push({ name, args }); return { data: [], error: null }; },
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
  });
  return { db, client };
}

// ---------- run one request through the real handler ----------
async function call(body, { userId = "u1" } = {}) {
  const { db, client } = makeDb();
  globalThis.__createClient = (_u, _k, opts) => client(opts?.global?.headers?.Authorization ? userId : userId);
  const seen = { embedInput: null, chatMessages: null };
  globalThis.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    if (String(url).includes("/embeddings")) {
      seen.embedInput = b.input;
      return { ok: true, json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) };
    }
    seen.chatMessages = b.messages;
    return { ok: true, json: async () => ({ choices: [{ message: { content: "REPLY" } }], usage: { total_tokens: 10 } }) };
  };
  const res = await h.handleRequest(new Request("http://x/ai-chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt(userId)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
  const json = await res.json();
  return { res, json, db, seen };
}
const lastUser = (seen) => seen.chatMessages[seen.chatMessages.length - 1].content;
const storedUser = (db, convId) => db.ai_messages.filter((m) => m.conversation_id === convId && m.role === "user" && m.user_id === "u1").map((m) => m.content);

// ---------- 1a. helper, pure ----------
{
  const r = h.splitClientNote(YOGA_MESSAGE, undefined);
  assert.equal(r.question, QUESTION);
  assert.equal(r.forModel, YOGA_MESSAGE, "model text is byte for byte what the client sent");
  const plain = h.splitClientNote("How do I warm up my hips?", undefined);
  assert.deepEqual(plain, { question: "How do I warm up my hips?", forModel: "How do I warm up my hips?" });
  const clean = h.splitClientNote(QUESTION, "Pigeon: Below range");
  assert.equal(clean.question, QUESTION);
  assert.equal(clean.forModel, `Pigeon: Below range\n\n${QUESTION}`);
  const both = h.splitClientNote(YOGA_MESSAGE, "extra line");
  assert.equal(both.question, QUESTION);
  assert.equal(both.forModel, `${NOTE}\n\nextra line\n\n${QUESTION}`);
  // start marker but no end marker: leave alone (cannot tell where the question starts)
  const broken = "[Background for this answer only. Follow it.]\nno end marker here";
  assert.equal(h.splitClientNote(broken, undefined).question, broken);
  // marker in the middle of a normal message is not a note
  const mid = `hello ${NOTE}\n\n${QUESTION}`;
  assert.equal(h.splitClientNote(mid, undefined).question, mid);
  // leading whitespace before the marker still counts
  assert.equal(h.splitClientNote(`\n  ${YOGA_MESSAGE}`, undefined).question, QUESTION);
  // not a string: unchanged (old behavior)
  assert.equal(h.splitClientNote(undefined, "x").question, undefined);
  // turn_context is capped
  assert.ok(h.splitClientNote("q", "z".repeat(50000)).forModel.length < 7000);
}

// ---------- 1b. current yoga client bytes, end to end ----------
{
  const { res, json, db, seen } = await call({ message: YOGA_MESSAGE, provider: "rombot" });
  assert.equal(res.status, 200, JSON.stringify(json));
  assert.equal(json.reply, "REPLY");
  const cid = json.conversation_id;
  assert.ok(cid && cid.startsWith("new-"), "new chat created");
  assert.deepEqual(storedUser(db, cid), [QUESTION], "stored user message is the question only");
  assert.ok(!db.ai_messages.some((m) => /Background for this answer only|Poses screen right now|Below range: Pigeon/.test(m.content)), "no note text in any stored message");
  const conv = db.ai_conversations.find((c) => c.id === cid);
  assert.equal(conv.title, QUESTION.slice(0, 60), "title is the question");
  assert.equal(seen.embedInput, QUESTION, "research search uses the real question");
  assert.equal(lastUser(seen), YOGA_MESSAGE, "model still sees the note plus the question");
  assert.ok(db.rpcCalls.length === 1, "research lookup ran");
}

// ---------- 1c. future clean client (turn_context) ----------
{
  const ctx = "Pigeon: Below range. Cat Cow: In range.";
  const { json, db, seen } = await call({ message: QUESTION, turn_context: ctx });
  assert.deepEqual(storedUser(db, json.conversation_id), [QUESTION]);
  assert.ok(!db.ai_messages.some((m) => m.content.includes("Pigeon: Below range")));
  assert.equal(db.ai_conversations.find((c) => c.id === json.conversation_id).title, QUESTION);
  assert.equal(seen.embedInput, QUESTION);
  assert.equal(lastUser(seen), `${ctx}\n\n${QUESTION}`);
}

// ---------- 1d. BB / BJJ / Base style plain message: nothing changes ----------
{
  const msg = "What should I work on first?";
  const { json, db, seen } = await call({ message: msg, sport: "bodybuilding" });
  assert.deepEqual(storedUser(db, json.conversation_id), [msg]);
  assert.equal(seen.embedInput, msg);
  assert.equal(lastUser(seen), msg);
}

// ---------- 2. chat ownership ----------
{
  // own chat: history loaded, same id back, no new chat, title untouched
  const r = await call({ message: "follow up", conversation_id: "c-own" });
  assert.equal(r.json.conversation_id, "c-own");
  assert.ok(r.seen.chatMessages.some((m) => m.content === "OWN-HISTORY-QUESTION"), "own history is loaded");
  assert.equal(r.db.ai_conversations.length, 2, "no new chat");
  assert.equal(r.db.ai_conversations.find((c) => c.id === "c-own").title, "Own chat");
  assert.deepEqual(storedUser(r.db, "c-own"), ["OWN-HISTORY-QUESTION", "follow up"]);
}
{
  // someone else's chat id: their history is never read or written, caller gets a fresh chat
  const r = await call({ message: "peek", conversation_id: "c-other" });
  assert.equal(r.res.status, 200);
  assert.ok(!r.seen.chatMessages.some((m) => /SECRET-OTHER-USER-TEXT/.test(m.content)), "other user's history is not read");
  assert.notEqual(r.json.conversation_id, "c-other");
  assert.ok(r.json.conversation_id.startsWith("new-"));
  assert.ok(!r.db.ai_messages.some((m) => m.conversation_id === "c-other" && m.user_id === "u1"), "nothing written into the other chat");
  assert.equal(r.db.ai_conversations.find((c) => c.id === r.json.conversation_id).title, "peek", "new chat gets a title");
}
{
  // unknown id (for example deleted by the 90 day clean-up): fresh chat, no error
  const r = await call({ message: "hello again", conversation_id: "c-gone" });
  assert.equal(r.res.status, 200);
  assert.ok(r.json.conversation_id.startsWith("new-"));
}
console.log("ai-chat note + chat owner tests: ok");
