// Option B gate tests (BUILD ONLY). No network: Deno.serve and fetch are stubbed. Run:
//   deno test --allow-env --allow-read supabase/functions/p1-25-storage-drain/index.test.ts
import { assertEquals } from "jsr:@std/assert@1";

const KEY = "test-only-service-role-key-0123456789abcdef";
const GOOD = "g".repeat(40);
Deno.env.set("SUPABASE_URL", "http://stub.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", KEY);

let handler: (req: Request) => Promise<Response> = async () => new Response("unset");
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: (req: Request) => Promise<Response>) => { handler = h; return {}; };

type Call = { url: string; method: string };
let calls: Call[] = [];
let rpcMode: "ok" | "throw" | "500" = "ok";
let queueCount = 0;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? "GET";
  calls.push({ url, method });
  if (url.endsWith("/rest/v1/rpc/verify_webhook_secret")) {
    if (rpcMode === "throw") throw new TypeError("network");
    if (rpcMode === "500") return new Response("err", { status: 500 });
    const body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify(body.p_name === "cron_webhook_secret" && body.p_candidate === GOOD), { status: 200 });
  }
  if (url.includes("/rest/v1/p1_25_storage_delete_queue") && method === "HEAD") {
    return new Response(null, { status: 200, headers: { "content-range": `*/${queueCount}` } });
  }
  return new Response("unexpected", { status: 599 });
}) as typeof fetch;

await import(Deno.env.get("P1_25_B_INDEX") ?? "./index.ts");
const post = (h: Record<string, string> = {}) => handler(new Request("http://x/", { method: "POST", headers: h }));
const reset = () => { calls = []; rpcMode = "ok"; queueCount = 0; };
const touchedQueue = () => calls.some((c) => c.url.includes("p1_25_storage_delete_queue") || c.url.includes("/storage/v1/"));

Deno.test("B1 GET is refused 405, nothing called", async () => {
  reset();
  const r = await handler(new Request("http://x/", { method: "GET" }));
  assertEquals(r.status, 405); assertEquals(calls.length, 0);
});
Deno.test("B2 no x-cron-secret: 403, no RPC, queue untouched", async () => {
  reset();
  const r = await post();
  assertEquals(r.status, 403); assertEquals(calls.length, 0);
});
Deno.test("B3 wrong secret: 403, queue untouched", async () => {
  reset();
  const r = await post({ "x-cron-secret": "w".repeat(40) });
  assertEquals(r.status, 403); assertEquals(touchedQueue(), false);
});
Deno.test("B4 verify RPC throws or 500: fail closed 403", async () => {
  reset(); rpcMode = "throw";
  assertEquals((await post({ "x-cron-secret": GOOD })).status, 403);
  rpcMode = "500";
  assertEquals((await post({ "x-cron-secret": GOOD })).status, 403);
  assertEquals(touchedQueue(), false);
});
Deno.test("B5 good secret, empty queue: 200 with five counts, key not in body", async () => {
  reset();
  const r = await post({ "x-cron-secret": GOOD });
  const t = await r.text();
  assertEquals(r.status, 200);
  const j = JSON.parse(t);
  assertEquals([j.ok, j.queued_at_start, j.deleted, j.already_missing, j.failed, j.remaining], [true, 0, 0, 0, 0, 0]);
  assertEquals(t.includes(KEY), false);
  assertEquals(calls.some((c) => c.url.includes("/storage/v1/")), false);
});
