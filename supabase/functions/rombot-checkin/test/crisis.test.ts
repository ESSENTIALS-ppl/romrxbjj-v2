// P1-17 crisis routing: replies to the check-in go to ai-chat in the same (user-owned) conversation, so the LIVE ai-chat crisis
// route (v96, unconditional, runs before any model call, Stacy v3 replies) answers pain or red-flag replies. This build adds NO
// trigger and NO words and does not touch ai-chat (Nov 3 lesson: do not widen the crisis triggers; L954 bare "numb"/"emergency"
// stay unmatched). The live handler is not in this repo, so this test runs against a pinned copy of live v96 when
// AI_CHAT_HANDLER points at it (sha256 below), and is ignored otherwise.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { noteFor } from "../source/handler.ts";
import { plan } from "../source/logic.ts";
import { ALL, at, cand } from "./fixtures.ts";

const LIVE_V96_HANDLER_SHA256 = "24f61509de9fc132a3da9b558fd13ecfc065455c014716153ba9b96cf0fc4554";
const path = Deno.env.get("AI_CHAT_HANDLER");
const note = noteFor(plan(at("2026-11-16T12:30:00Z"), [cand()], ALL).due[0]);

Deno.test({
  name: "live ai-chat v96 crisis route answers pain or red-flag replies in the check-in conversation; benign replies go to ROMBot",
  ignore: !path,
  fn: async () => {
    const bytes = await Deno.readFile(path!);
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    assertEquals(sha, LIVE_V96_HANDLER_SHA256);
    const m = await import(path!);
    const history = [{ role: note.message.role, content: note.message.content }];
    // Self-harm and crisis-number replies: Reply A. Emergency (chest pain, fainting, broken bone): Reply B. Words are ai-chat's own.
    for (const t of ["I want to hurt myself", "what's the crisis line number", "I have chest pain when I do it"]) {
      const k = m.detectCrisis(t, history);
      assert(k === "A" || k === "B", t);
      assert(m.crisisReply(k) === m.CRISIS_REPLY_A || m.crisisReply(k) === m.CRISIS_REPLY_B);
    }
    assertEquals(m.detectCrisis("I passed out after the stretch", history), "B");
    // Ordinary replies to Stacy's prompts are not crisis-routed (no new triggers added by P1-17).
    for (const t of ["it felt too easy", "work got in the way", "my hips feel tight", "yes"]) assertEquals(m.detectCrisis(t, history), null, t);
    // The check-in note is not Reply A, so it cannot switch on the soft-distress follow-up rule.
    assert(note.message.content !== m.CRISIS_REPLY_A);
  },
});
Deno.test("the check-in chat is owned by the user, so ai-chat's ownership check (FG-06) lets replies in and the crisis route runs", async () => {
  assertEquals(note.user_id, cand().user_id);
  if (!path) return;
  const m = await import(path);
  const rows = [{ id: "c1", user_id: note.user_id }];
  const client = { from: () => { const f: Record<string, string> = {}; const q = { select: () => q, eq: (k: string, v: string) => { f[k] = v; return q; }, maybeSingle: () => Promise.resolve({ data: rows.find((r) => r.id === f.id && r.user_id === f.user_id) ?? null }) }; return q; } };
  assertEquals(await m.conversationOwnedBy(client, "c1", note.user_id), true);
  assertEquals(await m.conversationOwnedBy(client, "c1", "someone-else"), false);
});
