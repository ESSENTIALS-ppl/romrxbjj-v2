// activate-beta-base: live v18 ("pin", git blob cfe0027b) vs this branch at options A and C. Supabase mocked; no network.
// Before the cutover: byte-identical traces (status, body, every call), flag on and off. From the cutover: refused, no reads or writes.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { activateTree, gitBlob, LIVE_ACTIVATE_V18_GIT, LIVE_ACTIVATE_V18_SHA256, loadHandler, OPTIONS, Opt, resetMocks, setNow, sha256Hex, SRC_ROOT, trace } from "./harness.ts";

const AUDIT_UID = "0e034562-f0c4-47c9-8ce3-a0310fb40391"; // first UID of the live v18 allowlist (already in the live source)
type Rec = Record<string, unknown>;
type Scn = { name: string; method?: string; auth?: string | null; flagRow?: Rec | null; users?: Rec[] };
const inactive = { id: AUDIT_UID, base_status: "inactive", email: "user@example.com" };
const SCN: Scn[] = [
  { name: "OPTIONS preflight", method: "OPTIONS" },
  { name: "GET", method: "GET" },
  { name: "no Authorization", auth: null },
  { name: "unknown JWT", auth: "Bearer nope" },
  { name: "real (non-audit) user", auth: "Bearer jwt-u1" },
  { name: "audit temp, flag off", auth: "Bearer jwt-audit", flagRow: { enabled: false } },
  { name: "audit temp, flag row missing", auth: "Bearer jwt-audit", flagRow: null },
  { name: "audit temp, flag on, inactive -> unlocked", auth: "Bearer jwt-audit", flagRow: { enabled: true }, users: [inactive, { id: AUDIT_UID, base_status: "active" }] },
  { name: "audit temp, flag on, already active", auth: "Bearer jwt-audit", flagRow: { enabled: true }, users: [{ ...inactive, base_status: "active" }] },
  { name: "audit temp, flag on, profile missing", auth: "Bearer jwt-audit", flagRow: { enabled: true }, users: [] },
  { name: "audit temp, flag on, update did not stick", auth: "Bearer jwt-audit", flagRow: { enabled: true }, users: [inactive, inactive] },
];
const ENVS: [string, string | undefined][] = [["FREE_UNLOCK_ENABLED unset", undefined], ["FREE_UNLOCK_ENABLED=true", "true"]];

const H: Record<string, (r: Request) => Promise<Response>> = { pin: await loadHandler(activateTree("pin")) };
for (const o of ["A", "C"] as Opt[]) H[o] = await loadHandler(activateTree(o));

async function run(h: (r: Request) => Promise<Response>, s: Scn, env: string | undefined, now: number) {
  const st = resetMocks();
  st.users["jwt-audit"] = { id: AUDIT_UID, email: "user@example.com" };
  if (s.flagRow !== undefined) st.tables.feature_flags = s.flagRow;
  if (s.users) { st.queue.users = s.users.map((u) => ({ ...u })); st.tables.users = null; }
  if (env === undefined) Deno.env.delete("FREE_UNLOCK_ENABLED"); else Deno.env.set("FREE_UNLOCK_ENABLED", env);
  setNow(now);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (s.auth !== null) headers.Authorization = s.auth ?? "Bearer jwt-u1";
  const m = s.method ?? "POST";
  return await trace(h, new Request("https://mock.supabase.test/functions/v1/activate-beta-base", { method: m, headers, body: m === "POST" ? "{}" : undefined }));
}
const writes = (t: { calls: unknown[] }) => (t.calls as Rec[]).filter((c) => c.kind === "db" && (c.ops as Rec[]).some((o) => ["upsert", "update", "insert", "delete"].includes(String(o.op))));

Deno.test("activate-beta-base: baseline is live v18 byte-exact; branch imports THE cutover (no copy of the value)", async () => {
  assertEquals(await sha256Hex(new TextEncoder().encode(gitBlob(LIVE_ACTIVATE_V18_GIT))), LIVE_ACTIVATE_V18_SHA256);
  const src = Deno.readTextFileSync(new URL("activate-beta-base/index.ts", SRC_ROOT));
  assert(src.includes('import { BASE_PAID_CUTOVER_UNIX } from "../_shared/arl_copy.ts";'));
  assert(src.includes("if (Date.now() >= BASE_PAID_CUTOVER_UNIX * 1000) {"));
  for (const v of ["1798650000", "1798779600", "1798822800"]) assertFalse(src.includes(v), v);
});

for (const o of ["A", "C"] as Opt[]) {
  const T = OPTIONS[o] * 1000;
  Deno.test(`activate-beta-base option ${o}: before the cutover (today, cutover-1s, cutover-1ms) byte-identical to live v18, flag on and off`, async () => {
    for (const t of [Date.UTC(2026, 10, 24, 19), T - 1000, T - 1]) {
      for (const s of SCN) for (const [en, ev] of ENVS) {
        const a = await run(H.pin, s, ev, t), b = await run(H[o], s, ev, t);
        assertEquals(JSON.stringify(b), JSON.stringify(a), `${s.name} / ${en} @ ${t - T} ms`);
      }
    }
    // Sanity: before the cutover the live unlock path really unlocks (so the identity check covers the write path).
    const ok = await run(H[o], SCN[7], undefined, T - 1000);
    assertEquals(ok.status, 200);
    assertEquals(writes(ok).length, 2);
  });
  Deno.test(`activate-beta-base option ${o}: at the cutover, +1 ms and +1 s, refused 402 beta_ended whatever the flag says, no read, no write`, async () => {
    for (const t of [T, T + 1, T + 1000, Date.UTC(2027, 5, 1)]) {
      for (const s of SCN) for (const [en, ev] of ENVS) {
        const r = await run(H[o], s, ev, t);
        const label = `${s.name} / ${en} @ +${t - T} ms`;
        if (s.method === "OPTIONS" || s.method === "GET") {
          assertEquals(JSON.stringify(r), JSON.stringify(await run(H.pin, s, ev, t)), label); // preflight and 405 as live
          continue;
        }
        assertEquals(r.status, 402, label);
        assertEquals(JSON.stringify(r.body), JSON.stringify({ error: "beta_ended", checkout_required: true, message: "Free Unlock has ended. Use Stripe checkout." }), label);
        assertEquals(r.calls.length, 0, `${label}: no rate-limit hit, auth, flag read or users write`);
      }
    }
  });
  Deno.test(`activate-beta-base option ${o}: live v18 would still unlock after the cutover with the flag on (what the cap closes)`, async () => {
    const live = await run(H.pin, SCN[7], "true", T + 1000);
    assertEquals(live.status, 200);
    assertEquals(writes(live).length, 2);
    const capped = await run(H[o], SCN[7], "true", T + 1000);
    assertEquals(capped.status, 402);
    assertEquals(writes(capped).length, 0);
  });
}
Deno.test("activate cleanup env", () => { Deno.env.delete("FREE_UNLOCK_ENABLED"); });
