// p1-25-storage-drain (option B). BUILT, NOT DEPLOYED. Deploy only after its own pin, Vera PASS and release:
//   supabase functions deploy p1-25-storage-drain --project-ref cqzvqzwwevnflinxgnpp --no-verify-jwt --use-api
// --no-verify-jwt is required: live cron_call_edge sends only x-cron-secret (no Authorization header); the
// x-cron-secret check below is the gate, fail-closed.
// Drains public.p1_25_storage_delete_queue through the Storage API using SUPABASE_SERVICE_ROLE_KEY from this
// function's own env (the platform sets it; nothing is stored in code). Caller must send x-cron-secret, checked
// fail-closed against vault cron_webhook_secret via verify_webhook_secret (same gate as send-renewal-reminders).
// Invoke: select public.cron_call_edge('p1-25-storage-drain', 120000);  (reads the result from net._http_response)
// Returns counts only: queued_at_start, deleted, already_missing, failed, remaining (+ masked failure paths).
import { drainQueue } from "../_shared/p1_25_storage_drain_core.mjs";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!(await cronCallerOk(req))) return new Response("forbidden", { status: 403 });
  try {
    const r = await drainQueue({ baseUrl: SUPABASE_URL, key: SUPABASE_SERVICE_KEY, log: (o: unknown) => console.log(JSON.stringify(o)) });
    return new Response(JSON.stringify({ ok: r.failed === 0, ...r }), { status: r.failed === 0 ? 200 : 207, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
