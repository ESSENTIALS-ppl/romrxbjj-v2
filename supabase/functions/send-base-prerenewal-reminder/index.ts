// send-base-prerenewal-reminder v1 DRAFT (2026-10-03, NOT deployed): daily pg_cron sender for the Base pre-renewal
// reminder (Base free trials ending Jan 1, 2027 12:00 ET, last free day Dec 31, 2026). Runs Dec 18, catches up to Dec 28.
// Same copy + same email_sends claim ("base_trial_will_end") as stripe-webhook's trial_will_end handler (PR #76).
// OFF unless PREREMINDER_CRON_ENABLED=true. Copy stays marked DRAFT until PREREMINDER_COPY_APPROVED flips in
// _shared/prerenewal_copy.ts (Stacy owns the final words). Logic lives in _shared/prerenewal_cron.ts (unit tested).
// Caller auth: only pg_cron (public.cron_call_edge) may trigger it (x-cron-secret vs Vault cron_webhook_secret).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logEvent } from "../_shared/events.ts";
import { runPrerenewalCron } from "../_shared/prerenewal_cron.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  if (!(await cronCallerOk(req))) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({})) as { dry_run?: boolean };
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const result = await runPrerenewalCron({
    supabase,
    fetchImpl: fetch,
    nowMs: Date.now(),
    enabled: (Deno.env.get("PREREMINDER_CRON_ENABLED") ?? "").toLowerCase() === "true",
    targetDate: Deno.env.get("PREREMINDER_CRON_TARGET_DATE") || undefined,
    dryRun: body.dry_run === true,
    resendKey: Deno.env.get("RESEND_API_KEY") ?? "",
    stripeKey: Deno.env.get("stripe_secret_key") ?? "",
    from: "ROMRx <hello@romrx.io>", // same sender as the stripe-webhook handler (BRAND_HQ)
    replyTo: "hello@romrx.io",
    logEvent,
  });
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
});
