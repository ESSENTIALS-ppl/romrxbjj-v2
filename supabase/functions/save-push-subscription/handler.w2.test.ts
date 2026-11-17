// P1-14 W2 tests for save-push-subscription: moving an endpoint from user A to user B clears A's legacy
// notification_preferences.push_subscription backup in the same request. One planted mutant per new test.
// Run: deno test --no-lock --node-modules-dir=none --allow-read --allow-write handler.w2.test.ts
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import * as H from "./handler.ts";
import type { Deps, Subscription } from "./handler.ts";

const EP = "https://push.example/device-moved";
const OTHER_EP = "https://push.example/device-other";
const sub = (endpoint: string, k = "P"): Subscription => ({ endpoint, keys: { p256dh: k.repeat(87), auth: "A".repeat(22) } });
const post = (b: unknown) => new Request("https://x.test/f", { method: "POST", body: JSON.stringify(b), headers: { Authorization: "Bearer t" } });

interface Row { id: string; userId: string; endpoint: string }
/** In-memory push_subscriptions + notification_preferences backups, mirroring index.ts semantics. */
function world(caller: string) {
  const rows: Row[] = [];
  const backups = new Map<string, Subscription | null>();
  let seq = 1;
  const d: Deps = {
    userId: async () => caller,
    touch: async (u, s) => rows.some((r) => r.endpoint === s.endpoint && r.userId === u),
    takeover: async (u, s) => {
      const r = rows.find((x) => x.endpoint === s.endpoint && x.userId !== u);
      if (!r) return "none";
      if (rows.filter((x) => x.userId === u).length >= 10) return "limit";
      rows.splice(rows.indexOf(r), 1);
      rows.push({ id: `new-${seq++}`, userId: u, endpoint: s.endpoint });
      return "taken";
    },
    insert: async (u, s) => {
      if (rows.some((x) => x.endpoint === s.endpoint)) throw new Error("unique_endpoint");
      rows.push({ id: `new-${seq++}`, userId: u, endpoint: s.endpoint });
      return "ok";
    },
    remove: async () => {},
    legacy: async (u, s) => { backups.set(u, s); },
    // same filter as index.ts: push_subscription->>endpoint = endpoint AND user_id <> caller
    clearOtherBackups: async (u, endpoint) => {
      for (const [k, v] of backups) if (k !== u && v && v.endpoint === endpoint) backups.set(k, null);
    },
    origins: () => ({}),
  };
  return { rows, backups, d };
}

async function moveClearsBackup(m: typeof H): Promise<boolean> {
  // A owns the device (table row + backup); C has an unrelated backup; B now saves A's endpoint.
  const w = world("user-b");
  w.rows.push({ id: "old-1", userId: "user-a", endpoint: EP });
  w.backups.set("user-a", sub(EP));
  w.backups.set("user-c", sub(OTHER_EP));
  const r = await m.handle(post({ subscription: sub(EP, "Q") }), w.d);
  if (r.status !== 200) return false;
  if (w.backups.get("user-a") !== null) return false; // A's backup cleared
  if (w.backups.get("user-b")?.endpoint !== EP) return false; // B's own backup written
  if (w.backups.get("user-c")?.endpoint !== OTHER_EP) return false; // unrelated endpoint untouched
  if (w.rows.length !== 1 || w.rows[0].userId !== "user-b") return false;
  // Legacy-only previous owner (no table row for A) is cleared too.
  const w2 = world("user-b");
  w2.backups.set("user-a", sub(EP));
  const r2 = await m.handle(post({ subscription: sub(EP, "Q") }), w2.d);
  return r2.status === 200 && w2.backups.get("user-a") === null && w2.backups.get("user-b")?.endpoint === EP;
}

const SRC = await Deno.readTextFile(new URL("./handler.ts", import.meta.url));
async function load(src: string) {
  const dir = await Deno.makeTempDir({ prefix: "p1-14-w2-save-mutant-" });
  const f = `${dir}/handler.ts`;
  await Deno.writeTextFile(f, src);
  return await import(`file://${f}`) as typeof H;
}

// W2-S1
Deno.test("w2 save: A-to-B device move clears A's legacy backup (and a legacy-only A), B's backup written, others untouched", async () => {
  assert(await moveClearsBackup(H));
});
Deno.test("w2 save mutant caught: clearOtherBackups call dropped from handle", async () => {
  const from = "    await d.clearOtherBackups(uid, s.endpoint);\n";
  assertEquals(SRC.split(from).length - 1, 1, "mutation anchor not unique");
  assertFalse(await moveClearsBackup(await load(SRC.replace(from, ""))), "mutant survived");
});

// W2-S2: index.ts query is service role, this exact endpoint, other users only, and errors fail the request.
const IDX = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
function indexScopedOk(src: string): boolean {
  return src.includes('const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");') &&
    src.includes('clearOtherBackups: async (user_id, endpoint) => {') &&
    src.includes('admin.from("notification_preferences").update({ push_subscription: null }).eq("push_subscription->>endpoint", endpoint).neq("user_id", user_id);') &&
    src.includes('if (error) throw new Error("backup clear failed");') &&
    !/console\./.test(src);
}
Deno.test("w2 save source: index.ts clears via service role, exact endpoint, other users only, throws on error", () => {
  assert(indexScopedOk(IDX));
});
Deno.test("w2 save source mutant caught: user scope (.neq user_id) dropped would clear the caller's own backup too", () => {
  const from = '.eq("push_subscription->>endpoint", endpoint).neq("user_id", user_id);';
  assertEquals(IDX.split(from).length - 1, 1, "mutation anchor not unique");
  assertFalse(indexScopedOk(IDX.replace(from, '.eq("push_subscription->>endpoint", endpoint);')), "mutant survived");
});
Deno.test("w2 save: a backup-clear error is a generic 500 and the caller's legacy backup is not written", async () => {
  const w = world("user-b");
  let legacy = 0;
  const r = await H.handle(post({ subscription: sub(EP) }), { ...w.d, clearOtherBackups: async () => { throw new Error("db: secret detail"); }, legacy: async () => { legacy++; } });
  assertEquals(r.status, 500);
  assertEquals(await r.json(), { error: "save_failed" });
  assertEquals(legacy, 0);
});
Deno.test("w2 save mutant caught: clear error swallowed", async () => {
  const from = "    await d.clearOtherBackups(uid, s.endpoint);\n";
  const m = await load(SRC.replace(from, "    await d.clearOtherBackups(uid, s.endpoint).catch(() => {});\n"));
  const w = world("user-b");
  const r = await m.handle(post({ subscription: sub(EP) }), { ...w.d, clearOtherBackups: async () => { throw new Error("x"); } });
  assertFalse(r.status === 500, "mutant survived");
});
