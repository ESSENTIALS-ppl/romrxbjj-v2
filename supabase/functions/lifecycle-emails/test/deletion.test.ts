// FG-21 wiring in the lifecycle sender: an open deletion request, from either record, blocks every email. Errors fail closed.
import { assertEquals, assert } from "jsr:@std/assert@1";
import { deletionRequested } from "../source/deletion.ts";

type R = { data?: unknown[]; error?: { code: string } | null };
function fake(tables: Record<string, R | "throw">) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  return {
    calls,
    from(table: string) {
      const c = { table, filters: [] as Array<[string, unknown]> }; calls.push(c);
      const q = {
        select: () => q, limit: () => q,
        eq: (k: string, v: unknown) => { c.filters.push([k, v]); return q; },
        in: (k: string, v: unknown) => { c.filters.push([k, v]); return q; },
        then: (res: (v: unknown) => void, rej: (e: unknown) => void) => {
          const t = tables[table];
          if (t === "throw") return Promise.reject(new Error("boom")).then(res, rej);
          return Promise.resolve({ data: t?.data ?? [], error: t?.error ?? null }).then(res, rej);
        },
      };
      return q;
    },
  };
}
const U = "00000000-0000-4000-8000-000000000001";

Deno.test("no request anywhere: false, and the open-status filter is exactly requested + in_progress", async () => {
  const sb = fake({ account_deletion_requests: { data: [] }, client_feedback: { data: [] } });
  assertEquals(await deletionRequested(sb, U), false);
  const log = sb.calls.find((c) => c.table === "account_deletion_requests")!;
  assertEquals(log.filters.find(([k]) => k === "status")![1], ["requested", "in_progress"]);
  assertEquals(log.filters.find(([k]) => k === "user_id")![1], U);
});
Deno.test("open request in the new log: true", async () => {
  assertEquals(await deletionRequested(fake({ account_deletion_requests: { data: [{ id: "x" }] }, client_feedback: { data: [] } }), U), true);
});
Deno.test("only the older client_feedback record exists: true", async () => {
  const sb = fake({ account_deletion_requests: { data: [] }, client_feedback: { data: [{ id: "y" }] } });
  assertEquals(await deletionRequested(sb, U), true);
  const fb = sb.calls.find((c) => c.table === "client_feedback")!;
  assertEquals(fb.filters.find(([k]) => k === "metadata->>kind")![1], "account_deletion_request");
});
Deno.test("log table missing (42P01, before the migration): falls back to client_feedback, which still protects", async () => {
  assertEquals(await deletionRequested(fake({ account_deletion_requests: { error: { code: "42P01" } }, client_feedback: { data: [{ id: "y" }] } }), U), true);
  assertEquals(await deletionRequested(fake({ account_deletion_requests: { error: { code: "42P01" } }, client_feedback: { data: [] } }), U), false);
});
Deno.test("any other error or exception fails closed (true = do not email)", async () => {
  assertEquals(await deletionRequested(fake({ account_deletion_requests: { error: { code: "XX000" } }, client_feedback: { data: [] } }), U), true);
  assertEquals(await deletionRequested(fake({ account_deletion_requests: { data: [] }, client_feedback: { error: { code: "XX000" } } }), U), true);
  assertEquals(await deletionRequested(fake({ account_deletion_requests: "throw", client_feedback: { data: [] } }), U), true);
});
Deno.test("the loader uses the real check, not a constant", async () => {
  const src = await Deno.readTextFile(new URL("../source/index.ts", import.meta.url));
  assert(src.includes("deletion_requested: await deletionRequested(sb, p.user_id)"));
  assert(!/deletion_requested:\s*false/.test(src));
});
