// P1-14 r3 tests for save-push-subscription: own-row touch, cross-user delete+insert (never silent reassign),
// device limit, legacy jsonb still written. Run:
// deno test --no-lock --node-modules-dir=none --allow-read --allow-write handler.test.ts
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { type Deps, handle, parseSubscription, saveDevice, type Subscription, type Takeover } from "./handler.ts";

const good: Subscription = { endpoint: "https://push.example/abc", keys: { p256dh: "P".repeat(87), auth: "A".repeat(22) } };

function mk(o: { uid?: string | null; touch?: boolean; ins?: "ok" | "limit" | "throw"; takeover?: Takeover | "throw"; legacyThrow?: boolean } = {}) {
  const log = { touch: 0, insert: 0, takeover: 0, remove: [] as string[], legacy: 0, touchUser: "" as string, takeoverUser: "" as string };
  const d: Deps = {
    userId: async () => o.uid === undefined ? "u1" : o.uid,
    touch: async (u) => { log.touch++; log.touchUser = u; return o.touch ?? false; },
    takeover: async (u) => { log.takeover++; log.takeoverUser = u; if (o.takeover === "throw") throw new Error("db: secret detail"); return o.takeover ?? "none"; },
    insert: async () => { log.insert++; if (o.ins === "throw") throw new Error("db: secret detail"); return o.ins ?? "ok"; },
    remove: async (u, e) => { log.remove.push(`${u}|${e}`); },
    legacy: async () => { log.legacy++; if (o.legacyThrow) throw new Error("x"); },
    origins: () => ({ "Access-Control-Allow-Origin": "https://romrx.io" }),
  };
  return { d, log };
}
const post = (b: unknown, auth = true) => new Request("https://x.test/f", { method: "POST", body: JSON.stringify(b), headers: auth ? { Authorization: "Bearer t" } : {} });

Deno.test("401 without Authorization or with a bad JWT, nothing written", async () => {
  const a = mk(); assertEquals((await handle(post({ subscription: good }, false), a.d)).status, 401);
  const b = mk({ uid: null }); assertEquals((await handle(post({ subscription: good }), b.d)).status, 401);
  assertEquals(a.log.insert + b.log.insert + b.log.touch + b.log.legacy + b.log.takeover, 0);
});
Deno.test("GET 405, OPTIONS 204 with CORS", async () => {
  const m = mk(); assertEquals((await handle(new Request("https://x.test/f", { method: "GET" }), m.d)).status, 405);
  const o = await handle(new Request("https://x.test/f", { method: "OPTIONS" }), m.d); assertEquals(o.status, 204); assert(o.headers.get("Access-Control-Allow-Origin"));
});
Deno.test("invalid subscriptions are 400 and write nothing", async () => {
  const m = mk();
  for (const bad of [undefined, null, {}, { endpoint: "http://insecure/x", keys: good.keys }, { endpoint: good.endpoint }, { endpoint: good.endpoint, keys: { p256dh: "short", auth: good.keys.auth } }, { endpoint: good.endpoint, keys: { p256dh: good.keys.p256dh, auth: "x" } }, { endpoint: "https://" + "a".repeat(3000), keys: good.keys }, { endpoint: 5, keys: good.keys }])
    assertEquals((await handle(post({ subscription: bad }), m.d)).status, 400);
  assertEquals(m.log.insert + m.log.touch + m.log.legacy + m.log.takeover, 0);
});
Deno.test("invalid JSON is 400", async () => { const m = mk(); assertEquals((await handle(new Request("https://x.test/f", { method: "POST", body: "{", headers: { Authorization: "b" } }), m.d)).status, 400); });
Deno.test("new device is inserted, legacy column still written", async () => {
  const m = mk(); const r = await handle(post({ subscription: good }), m.d); assertEquals(r.status, 200);
  assertEquals([m.log.touch, m.log.takeover, m.log.insert, m.log.legacy], [1, 1, 1, 1]);
});
Deno.test("caller's own endpoint is touched, not inserted or taken over", async () => {
  const m = mk({ touch: true }); assertEquals((await handle(post({ subscription: good }), m.d)).status, 200);
  assertEquals([m.log.touch, m.log.takeover, m.log.insert, m.log.legacy], [1, 0, 0, 1]);
});
Deno.test("cross-user endpoint is taken over (delete+insert), not silently touched, legacy still written", async () => {
  const m = mk({ takeover: "taken" }); assertEquals((await handle(post({ subscription: good }), m.d)).status, 200);
  assertEquals([m.log.touch, m.log.takeover, m.log.insert, m.log.legacy], [1, 1, 0, 1]);
});
Deno.test("device limit on insert gives 409 and does not touch the legacy column", async () => {
  const m = mk({ ins: "limit" }); const r = await handle(post({ subscription: good }), m.d); assertEquals(r.status, 409); assertEquals(m.log.legacy, 0);
});
Deno.test("device limit on cross-user takeover gives 409, does not insert, does not write legacy", async () => {
  const m = mk({ takeover: "limit" }); const r = await handle(post({ subscription: good }), m.d);
  assertEquals(r.status, 409);
  assertEquals(await r.json(), { error: "device_limit_reached" });
  assertEquals([m.log.insert, m.log.legacy], [0, 0]);
});
Deno.test("database errors give a generic 500 with no database text", async () => {
  for (const o of [{ ins: "throw" as const }, { takeover: "throw" as const }, { legacyThrow: true }]) {
    const m = mk(o); const r = await handle(post({ subscription: good }), m.d);
    assertEquals(r.status, 500); assertEquals(await r.json(), { error: "save_failed" });
  }
});
Deno.test("unsubscribe removes only the caller's own endpoint (user id comes from the JWT, not the body)", async () => {
  const m = mk(); const r = await handle(post({ unsubscribe: true, endpoint: good.endpoint, user_id: "victim" }), m.d);
  assertEquals(r.status, 200); assertEquals(m.log.remove, [`u1|${good.endpoint}`]);
  assertEquals((await handle(post({ unsubscribe: true }), m.d)).status, 400);
});
Deno.test("parseSubscription accepts a real-shaped subscription", () => { assert(parseSubscription(good)); });
Deno.test("source: user id never read from the body, no console logging", async () => {
  const s = await Deno.readTextFile(new URL("./handler.ts", import.meta.url));
  assert(!/body\.user_id|body\.userId/.test(s)); assert(!/console\./.test(s));
});

// ---------- in-memory store: prove no silent reassign ----------
interface Row { id: string; userId: string; endpoint: string; p256dh: string; auth: string }
function mem() {
  const rows: Row[] = [];
  let seq = 1;
  const ops: Pick<Deps, "touch" | "takeover" | "insert"> = {
    touch: async (userId, s) => {
      const r = rows.find((x) => x.endpoint === s.endpoint && x.userId === userId);
      if (!r) return false;
      r.p256dh = s.keys.p256dh;
      r.auth = s.keys.auth;
      return true;
    },
    takeover: async (userId, s) => {
      const r = rows.find((x) => x.endpoint === s.endpoint && x.userId !== userId);
      if (!r) return "none";
      if (rows.filter((x) => x.userId === userId).length >= 10) return "limit";
      rows.splice(rows.indexOf(r), 1);
      rows.push({ id: `new-${seq++}`, userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
      return "taken";
    },
    insert: async (userId, s) => {
      if (rows.filter((x) => x.userId === userId).length >= 10) return "limit";
      if (rows.some((x) => x.endpoint === s.endpoint)) throw new Error("unique_endpoint");
      rows.push({ id: `new-${seq++}`, userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
      return "ok";
    },
  };
  return { rows, ops };
}

Deno.test("r3 store: own endpoint updates keys on the same row id and does not change user_id", async () => {
  const st = mem();
  st.rows.push({ id: "row-1", userId: "user-b", endpoint: good.endpoint, p256dh: "P".repeat(87), auth: "A".repeat(22) });
  const rotated: Subscription = { endpoint: good.endpoint, keys: { p256dh: "Q".repeat(87), auth: "B".repeat(22) } };
  assertEquals(await saveDevice("user-b", rotated, st.ops), "ok");
  assertEquals(st.rows.length, 1);
  assertEquals(st.rows[0].id, "row-1");
  assertEquals(st.rows[0].userId, "user-b");
  assertEquals(st.rows[0].p256dh, "Q".repeat(87));
});

Deno.test("r3 store: cross-user endpoint deletes the old row and inserts a fresh row for the caller (new id, never a silent reassign)", async () => {
  const st = mem();
  st.rows.push({ id: "old-1", userId: "user-a", endpoint: good.endpoint, p256dh: "P".repeat(87), auth: "A".repeat(22) });
  const rotated: Subscription = { endpoint: good.endpoint, keys: { p256dh: "Q".repeat(87), auth: "B".repeat(22) } };
  assertEquals(await saveDevice("user-b", rotated, st.ops), "ok");
  assertEquals(st.rows.length, 1);
  assertEquals(st.rows[0].userId, "user-b");
  assertEquals(st.rows[0].id, "new-1");
  assertFalse(st.rows[0].id === "old-1");
  assertEquals(st.rows[0].p256dh, "Q".repeat(87));
  assertEquals(st.rows.filter((r) => r.userId === "user-a").length, 0);
});

Deno.test("r3 store: cross-user takeover at the 10-device cap leaves the other user's row untouched", async () => {
  const st = mem();
  st.rows.push({ id: "old-1", userId: "user-a", endpoint: good.endpoint, p256dh: "P".repeat(87), auth: "A".repeat(22) });
  for (let i = 0; i < 10; i++) {
    st.rows.push({ id: `b-${i}`, userId: "user-b", endpoint: `https://push.example/b-${i}`, p256dh: "P".repeat(87), auth: "A".repeat(22) });
  }
  assertEquals(await saveDevice("user-b", good, st.ops), "limit");
  const other = st.rows.find((r) => r.id === "old-1");
  assert(other);
  assertEquals(other!.userId, "user-a");
  assertEquals(other!.endpoint, good.endpoint);
});

Deno.test("r3 store: a new endpoint is inserted for the caller", async () => {
  const st = mem();
  assertEquals(await saveDevice("user-b", good, st.ops), "ok");
  assertEquals(st.rows.length, 1);
  assertEquals(st.rows[0].userId, "user-b");
  assertEquals(st.rows[0].endpoint, good.endpoint);
});

// ---------- index.ts source: the live bug must not be present ----------
Deno.test("r3 source: live silent-reassign pattern is gone; touch is scoped to the caller; takeover is delete+insert", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  // The live v21 (ezbr 5d123c2b) line reassigned by updating user_id on any endpoint match.
  assertFalse(/\.update\(\{\s*user_id\s*,/.test(src), "touch must not write user_id");
  assertFalse(/update\(\{\s*user_id:/.test(src), "no update of user_id");
  assert(src.includes('.eq("endpoint", s.endpoint).eq("user_id", user_id)'), "touch must match caller rows only");
  assert(src.includes('.update({ p256dh: s.keys.p256dh, auth: s.keys.auth, failure_count: 0, disabled_at: null })'), "touch updates keys only");
  assert(src.includes('.delete().eq("id", (other as { id: string }).id).eq("endpoint", s.endpoint).neq("user_id", user_id)'), "takeover deletes the other user's row");
  assert(src.includes('.insert({ user_id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth })'), "takeover/insert creates a fresh row");
  assert(src.includes("if ((count ?? 0) >= 10) return \"limit\""), "takeover respects the 10-device cap before delete");
  assert(src.includes("push_subscription: s"), "legacy jsonb write kept");
  assertFalse(/console\./.test(src));
});

// ---------- planted mutants on handler.ts saveDevice / handle path ----------
const SRC = await Deno.readTextFile(new URL("./handler.ts", import.meta.url));
async function load(src: string) {
  const dir = await Deno.makeTempDir({ prefix: "p1-14-r3-save-mutant-" });
  const f = `${dir}/handler.ts`;
  await Deno.writeTextFile(f, src);
  return await import(`file://${f}`) as typeof import("./handler.ts");
}

async function saveOk(m: typeof import("./handler.ts")): Promise<boolean> {
  const stRows: Row[] = [{ id: "old-1", userId: "user-a", endpoint: good.endpoint, p256dh: "P".repeat(87), auth: "A".repeat(22) }];
  let seq = 1;
  const ops: Pick<Deps, "touch" | "takeover" | "insert"> = {
    touch: async (userId, s) => {
      // Mutant-resistant expected behaviour is encoded in saveDevice's call pattern;
      // this fake still only updates own rows.
      const r = stRows.find((x) => x.endpoint === s.endpoint && x.userId === userId);
      if (!r) return false;
      r.p256dh = s.keys.p256dh;
      r.auth = s.keys.auth;
      return true;
    },
    takeover: async (userId, s) => {
      const r = stRows.find((x) => x.endpoint === s.endpoint && x.userId !== userId);
      if (!r) return "none";
      stRows.splice(stRows.indexOf(r), 1);
      stRows.push({ id: `new-${seq++}`, userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
      return "taken";
    },
    insert: async (userId, s) => {
      const r = stRows.find((x) => x.endpoint === s.endpoint);
      if (r) {
        // silent reassign (the live bug) — if saveDevice ever did this, the test must fail
        r.userId = userId;
        return "ok";
      }
      stRows.push({ id: `new-${seq++}`, userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
      return "ok";
    },
  };
  const result = await m.saveDevice("user-b", good, ops);
  if (result !== "ok") return false;
  if (stRows.length !== 1) return false;
  if (stRows[0].userId !== "user-b") return false;
  if (stRows[0].id === "old-1") return false; // reassigned in place
  return true;
}

const MUTANTS: [string, string, string][] = [
  ["saveDevice skips takeover and inserts (would hit a unique endpoint / silent path)", "  const t = await d.takeover(userId, s);\n  if (t === \"taken\") return \"ok\";\n  if (t === \"limit\") return \"limit\";\n  return await d.insert(userId, s);", "  return await d.insert(userId, s);"],
  ["saveDevice treats any touch miss as insert only (takeover dropped)", "  if (await d.touch(userId, s)) return \"ok\";\n  const t = await d.takeover(userId, s);", "  if (await d.touch(userId, s)) return \"ok\";\n  const t = \"none\" as const; void d.takeover;"],
];

Deno.test("r3 save mutants: unmutated source uses delete+insert, not an in-place reassign", async () => {
  assert(await saveOk(await load(SRC)));
});
for (const [name, from, to] of MUTANTS) {
  Deno.test(`r3 save mutant caught: ${name}`, async () => {
    assertEquals(SRC.split(from).length - 1, 1, `mutation anchor not unique: ${name}`);
    const m = await load(SRC.replace(from, to));
    assertFalse(await saveOk(m), `mutant survived: ${name}`);
  });
}
